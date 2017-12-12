const fs = require('fs');
const path = require('path');
const express = require('express');
const proxyMiddleware = require('http-proxy-middleware');
// const compression = require('compression');
// const serialize = require('serialize-javascript');
const lruCache = require('lru-cache');
const { createBundleRenderer } = require('vue-server-renderer');
const net = require('net');
const shell = require('shelljs');
const favicon = require('serve-favicon');
const cors = require('cors');
const config = require('../config/env.index');
const utils = require('./utils');



function killPort(port) {
    return new Promise((resolve, reject) => {
        try {
            const processId = Number(shell.exec(`lsof -t -s TCP:LISTEN -i:${port}`));
            if (processId) {
                utils.log.info(`***Killing process: ${processId}`);
                shell.exec(`kill ${processId}`, () => {
                    utils.log.success(`***Killed process: ${processId}`);
                    setTimeout(resolve, 1000);
                });
            } else {
                reject('Not found the process，if run it with root privilege，kill the process manually');
            }
        } catch (e) {
            reject(e);
        }
    });
}

function checkPort(port) {
    const server = net.createServer().listen(port);
    return new Promise((resolve, reject) => {
        server.on('listening', server.close);
        server.on('error', (error) => {
            let errorMessage = error.code;
            switch (error.code) {
                case 'EADDRINUSE':
                    errorMessage = `Port: ${port} used`;
                    break;
                case 'EACCES':
                    errorMessage = `Haven't privilege listen the port:  ${port}`;
                    break;
                default:
                    break;
            }
            reject(errorMessage);
        });
        server.on('close', resolve);
    });
}

function listenPort(app, port) {
    app.listen(port, () => {
        utils.log.success(`Service started on localhost:${port}`);
    });
}

const isDev = process.env.NODE_ENV === 'development';
const pathResolve = file => path.resolve(__dirname, file);
const template = fs.readFileSync(pathResolve('../app/index.template.html'), 'utf-8');

function createRenderer(bundle, options) {
    // https://github.com/vuejs/vue/blob/dev/packages/vue-server-renderer/README.md#why-use-bundlerenderer
    const cache = config.env.cache && config.env.cache.lruPageCache
        ? lruCache(config.env.cache.lruPageCache)
        : lruCache({
            max: 1000,
            maxAge: 1000 * 60 * 15,
        });
    return createBundleRenderer(bundle, Object.assign(options, {
        template,
        // for component caching
        cache,
        // recommended for performance
        runInNewContext: false,
    }));
}

function serve(assetsPath) {
    const options = config.env.cache && config.env.cache.assetsCache
        ? config.env.cache.assetsCache
        : {
            maxAge: 0,
        };
    return express.static(pathResolve(assetsPath), options);
}

function startServer(app) {
    /**
     * convert static resources to  gzip file
     * Must locate this interceptor before register static directory
     * -------- start ---------
     */
    if (!isDev) {
        app.get(/^(?!manifest).+\.js$/, (req, res, next) => {
            req.url += '.gz';
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Content-Encoding', 'gzip');
            next();
        });
        app.get(/\.css$/, (req, res, next) => {
            req.url += '.gz';
            res.setHeader('Content-Type', 'text/css');
            res.setHeader('Content-Encoding', 'gzip');
            next();
        });
    }
    /**
     * ---------- end ----------
     */

    app.use('/dist', serve('../dist'));
    app.use('/public', serve('../public'));
    app.use(cors());
    app.use(favicon(config.biz.favicon));

    /**
     *  Disable dynamic gzip
     app.use(compression(config.env.gzip || {
            level: 0,
            threshold: 0,
        }));
     */

    app.use((req, res, next) => {
        res.cookie('last-active-time', new Date().getTime());
        next();
    });

    if (config.env.proxyTable) {
        Object.keys(config.env.proxyTable).forEach((context) => {
            let options = config.env.proxyTable[context];
            if (typeof options === 'string') {
                options = {
                    target: options,
                };
            }
            const onProxyReq = (proxyReq, req) => {
                const clientIP = req.ip.match(/\d+\.\d+\.\d+\.\d+/ig);
                if (clientIP && clientIP.length) proxyReq.setHeader('Gz-Client-Ip', clientIP[0]);
            };
            app.use(proxyMiddleware(context, Object.assign({}, options, { onProxyReq })));
        });
    }

    const port = config.env.port;

    checkPort(port).then(() => {
        listenPort(app, port);
    }).catch((error) => {
        utils.log.error(error);
        if (config.env.autoKill) {
            killPort(port).then(() => {
                listenPort(app, port);
            }).catch((err) => {
                utils.log.error('####Failed kill the process', err);
            });
        }
    });

    let renderer;
    let handleRender;
    const serverInfo = `express/${require('express/package.json').version} vue-server-renderer/${require('vue-server-renderer/package.json').version}`;

    function render(req, res) {
        if (!renderer) {
            return res.end('waiting for compilation... refresh in a moment.');
        }

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Server', serverInfo);

        const startTime = Date.now();
        const context = {
            url: req.url,
        };
        const handleError = (err) => {
            const code = err.code === '404' ? 404 : 500;
            fs.readFile(`./app/pages/error/${code}.html`, (error, data) => {
                res.writeHead(code, { 'content-type': 'text/html' });
                res.end(data);
            });
            utils.log.error(`请求出错: ${err.code} ${req.url}`);
        };
        renderer.renderToString(context, (err, html) => {
            if (err) {
                utils.log.error('------------------------------- error start -------------------------------');
                console.dir(err);
                utils.log.error('-------------------------------- error end --------------------------------');
                return handleError(err);
            }
            res.end(html);
            if (isDev) {
                console.log(`whole request: ${Date.now() - startTime}ms`);
            }
        });
    }

    if (isDev) {
        // In development: setup the dev server with watch and hot-reload,
        // and create a new renderer on bundle / index template update.
        const devServer = require('./server.dev');
        const renderPromise = devServer(app, (bundle, options) => {
            renderer = createRenderer(bundle, options);
        });
        handleRender = (req, res) => {
            renderPromise.then(() => render(req, res));
        };
    } else {
        // In production: create server renderer using built server bundle.
        // The server bundle is generated by vue-ssr-webpack-plugin.
        const serverBundle = require('../dist/vue-ssr-server-bundle.json');
        // The client manifests are optional, but it allows the renderer
        // to automatically infer preload/prefetch links and directly add <script>
        // tags for any async chunks used during render, avoiding waterfall requests.
        const clientManifest = require('../dist/vue-ssr-client-manifest.json');
        renderer = createRenderer(serverBundle, {
            clientManifest,
        });
        handleRender = render;
    }

    app.get('/download', (req, res) => {
        const ua = req.headers['user-agent'].toLowerCase();

        if (/iphone|ipad|ipod/.test(ua)) {
            return res.redirect(302, 'https://itunes.apple.com/us/app/行理/id1234148962?mt=8');
        }
        if (/android/.test(ua)) {
            return res.redirect(302, 'http://sj.qq.com/myapp/detail.htm?apkName=com.gznb.xl');
        }
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('抱歉，暂不支持您的系统');
    });

    app.get('*', handleRender);
}

startServer(express())
