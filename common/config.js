
console.log('Resolving:', process.env.CONFIG);
console.log('DIR:', __dirname);

const cfg = process.env.CONFIG ? require(process.env.CONFIG) : require('@config/local.json');

cfg.title = process.env.SITE_NAME || cfg.title || 'My app';
cfg.port  = process.env.PORT || cfg.port || 9080;

cfg.sessionTimeout = 7 * 24 * 3600 * 1000; // 1 week

global.kConfig = cfg;
