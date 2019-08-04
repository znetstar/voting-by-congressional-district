/*
    Results by district obtained from http://bit.ly/2Km68Qf - © 2012 Kos Media, LLC
    Results by state obtained from http://bit.ly/2YKQSWg - © 2017 MIT Election Data and Science Lab
*/
const path = require('path');
const { promisify } = require('util');
const request = require('request-promise-native');
const parseCSV = require('csv-parse');
const fs = require('fs-extra');

const dataUrl = `https://docs.google.com/spreadsheets/d/1zLNAuRqPauss00HDz4XbTH2HqsCzMe0pR8QmD1K8jk8/export?format=csv&id=1zLNAuRqPauss00HDz4XbTH2HqsCzMe0pR8QmD1K8jk8&gid=0`;
const districtOutput = {};
const stateOutput = {};

module.exports = async function () {
    await fs.mkdirp(path.join(__dirname, 'dist', 'lib'));
    await fs.mkdirp(path.join(__dirname, 'dist', 'data'));
    
    let districtSvg = await request({ url: 'https://upload.wikimedia.org/wikipedia/commons/archive/a/a9/20161109013125%212016_presidential_election%2C_results_by_congressional_district_%28popular_vote_margin%29.svg', encoding: 'utf8' })
    districtSvg = districtSvg.split("\n").slice(1).join("\n");
    await fs.writeFile(path.join(__dirname, 'dist', 'data', 'us-map-by-district.svg'), districtSvg);
    request('https://raw.githubusercontent.com/hakimel/reveal.js/master/plugin/zoom-js/zoom.js').pipe(fs.createWriteStream(path.join(__dirname, 'dist', 'lib', 'zoom.js')))

    const distCsv = await request({
        url: dataUrl
    });

    const distRows = await promisify(parseCSV)(distCsv);
    for (const cols of distRows.slice(2)) {
        const district = cols[0];
        const state = district.split('-').shift();
        const clinton = Number(cols[3])/100;
        const trump = Number(cols[4])/100;

        districtOutput[district] = { district, state, clinton, trump };
    }

    const stateCsv = await request({
        url: `https://dataverse.harvard.edu/api/access/datafile/3444051?format=original&gbrecs=true`
    });

    const stateRows = await promisify(parseCSV)(stateCsv);
    for (const cols of stateRows.filter((r) => r[0] === '2016')) {
        const state = cols[2];
        const votes = Number(cols[10]);
        const can = cols[7];

        if (!stateOutput[state])
            stateOutput[state] = {};

        if (can === 'Trump, Donald J.') {
            stateOutput[state].trump = (stateOutput[state].trump || 0) + votes;
        } else if (can === 'Clinton, Hillary') {
            stateOutput[state].clinton = (stateOutput[state].clinton || 0) + votes;
        }
    }
    
    await fs.writeFile(path.join(__dirname, 'dist', 'data', '2016-by-district.json'), JSON.stringify(districtOutput, null, 4), "utf8");
    await fs.writeFile(path.join(__dirname, 'dist', 'data', '2016-by-state.json'), JSON.stringify(stateOutput, null, 4), "utf8");
};