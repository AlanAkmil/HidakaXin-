const { createSankaScraper } = require('./sankaScraper');

// Same sankavollerei API, same response shape as Otakudesu — just a
// different site prefix (see SITE_PATHS in sankaScraper.js). If Samehadaku
// pages come back empty/404 after deploy, that prefix is the only thing
// that needs adjusting.
module.exports = createSankaScraper('samehadaku');
