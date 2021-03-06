import URL from 'url-parse';
import fs from 'fs';
import Promise from 'bluebird';

let readFile = Promise.promisify(fs.readFile);

// converts the req.body to the options object getPost needs
export function getPostParams(post) {
  let url = new URL(post.url);
  return {
    host: 'http://' + url.hostname,
    path: url.pathname
  }
}

// converts the req.body to the options object search needs
export function getSearchParams(search) {
  return parseSite(search)
    .then(parseBoard)
    .then(params => {
      return {
        host: 'http://' + params.region + '.craigslist.org',
        path: params.board + '?' + 's=' + (params.page - 1) * 100 + '&' + 'query=' + params.query
      };
  });
}

function parseSite(search) {
  const siteMap = '/Users/homestead/Dropbox/Code/talos/server/maps/siteMap.json';
  return readFile(siteMap, 'utf-8')
    .then(sites => {
      let map = JSON.parse(sites);
      let zone = search.zone;
      let territory = search.territory;
      let site = search.site;

      search.region = map[zone][territory][site];

      return search;
    });
}

function parseBoard(search) {
  const categoryMap = '/Users/homestead/Dropbox/Code/talos/server/maps/categoryMap.json';
  return readFile(categoryMap, 'utf-8')
    .then(categories => {
      let map = JSON.parse(categories);
      let subcategory = search.subcategory;
      let category = search.category;
      
      if(subcategory === null) {
        search.board = map[category]['path'];
      } else {
        search.board = map[category]['subcategories'][subcategory];
      }

      return search;
    });
}
