/*
    Results by district obtained from http://bit.ly/2Km68Qf - © 2012 Kos Media, LLC
    Results by state obtained from http://bit.ly/2YKQSWg - © 2017 MIT Election Data and Science Lab
    Economic and Population data obtained from https://www.census.gov/mycd - The United States Census Bureau
*/
const path = require('path');
const { promisify } = require('util');
const request = require('request-promise-native');
const parseCSV = require('csv-parse');
const fs = require('fs-extra');

const dataUrl = `https://docs.google.com/spreadsheets/d/1zLNAuRqPauss00HDz4XbTH2HqsCzMe0pR8QmD1K8jk8/export?format=csv&id=1zLNAuRqPauss00HDz4XbTH2HqsCzMe0pR8QmD1K8jk8&gid=0`;
const districtOutput = {};
const stateOutput = {};
const stateCodeToStateName = {};
const stateCodeToNum = {};

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

    console.log(`getting results for districts...`)
    const distRows = await promisify(parseCSV)(distCsv);
    for (const cols of distRows.slice(2)) {
        const district = cols[0];
        const state = district.split('-').shift();


        const clinton = Number(cols[3])/100;
        const trump = Number(cols[4])/100;

        districtOutput[district] = { district, state, clinton, trump };
    }

    console.log(`getting results for states...`)
    const stateCsv = await request({
        url: `https://dataverse.harvard.edu/api/access/datafile/3444051?format=original&gbrecs=true`
    });

    const stateRows = await promisify(parseCSV)(stateCsv);
    for (const cols of stateRows.filter((r) => r[0] === '2016')) {
        const state = cols[2];
        const votes = Number(cols[10]);
        const can = cols[7];

        stateCodeToStateName[cols[1]] = state;

        if (!stateOutput[state])
            stateOutput[state] = {};

        if (can === 'Trump, Donald J.') {
            stateOutput[state].trump = (stateOutput[state].trump || 0) + votes;
        } else if (can === 'Clinton, Hillary') {
            stateOutput[state].clinton = (stateOutput[state].clinton || 0) + votes;
        }
    }

    let data = await request({
        url: `https://www.census.gov/mycd/application/bin/functs_easystats.local.php?call=get_geography&geo_level_1=*&geo_level_2=*&url=https%3A%2F%2Fapi.census.gov%2Fdata%2F2017%2Facs%2Facs1%2Fprofile&key=f4a93d15173229253a4f234727b2902053f61bbd%3Bmycd&geo_type=STATE`,
        transform: (body) => JSON.parse(body)
    });

    for (const ele of data) {
        const code = stateCodeToStateName[ele.name];

        stateCodeToNum[code] = ele.fips;
    }
    

    for (let districtName in districtOutput) {
        await new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    console.log(`getting economic data for ${districtName}...`)
                    let district = districtName.split('-').pop();
                    if (district === 'AL')
                        district = 0;

                        
                    const state = districtName.split('-').shift();
                    const u =  `https://www.census.gov/mycd/application/bin/data_download.php?geo_level_1=${stateCodeToNum[state]}&url=https%3A%2F%2Fapi.census.gov%2Fdata%2F2017%2Facs%2Facs1%2Fprofile&geo_type=CONGRESSIONAL_DISTRICT&geo_level_2=${district}&key=f4a93d15173229253a4f234727b2902053f61bbd%3Bmycd&call=export_excel&moe=undefined&state_name=${state}`
                    const incomeCsv = await request({
                        url: u
                    });

                    const incomeRows = await promisify(parseCSV)(incomeCsv, { skip_lines_with_error: true });
                    const mhhi = incomeRows.filter((r) => r[2] === 'Median household income (dollars)')[0];
                    const pv = incomeRows.filter((r) => r[1] === 'Percentage of Families and People Whose Income in the Past 12 Months is Below the Poverty Level' && r[2] === 'All families')[0];
                    
                    if (mhhi) {
                        const medianHouseholdIncome = Number(mhhi[3]);
                        districtOutput[districtName].medianHouseholdIncome = medianHouseholdIncome;
                    }        
                    if (pv) {
                        districtOutput[districtName].percentageFamiliesBelowPovertyLine = Number(pv[3])
                    }


                    resolve();
                } catch (err) {
                    reject(err);
                }
            }, 1000);
        });
    }
    
    await fs.writeFile(path.join(__dirname, 'dist', 'data', '2016-by-district.json'), JSON.stringify(districtOutput, null, 4), "utf8");
    await fs.writeFile(path.join(__dirname, 'dist', 'data', '2016-by-state.json'), JSON.stringify(stateOutput, null, 4), "utf8");
};