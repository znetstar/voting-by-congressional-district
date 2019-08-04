const $ = window.jQuery = window.$ = require('jquery');
require('velocity-animate');
const ejs = require('ejs');
const Reveal = window.Reveal = require('reveal.js/js/reveal');
let districtData, stateData, map;

/* Taken from <https://stackoverflow.com/a/5624139>. Thank you Tim Down! */
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

(async () => {
    districtData = await (await fetch(`/data/2016-by-district.json`)).json();
    stateData = await (await fetch(`/data/2016-by-state.json`)).json();

    for (const districtName in districtData) {
        const district = districtData[districtName];
        stateData[district.state].districts = (stateData[district.state].districts || []).concat(district);
    }

    const maps = {
        district: await (await fetch(`/data/us-map-by-district.svg`)).text()
    };

    // function assignColorToDistrict(districtName) {
    //     const { trump, clinton } = data[districtName];

    //     $(`.present #${districtName}`)
    //         .velocity({
    //             fill: rgbToHex((trump*255), 0, (clinton*255))
    //         }, {
    //             duration: 1000
    //         });
    // }
    
    function selectByState(...stateNames) {
        return $(`.present ${[].concat(stateNames).map(n => '[id*='+n+'-]')}`);
    }

    function selectByDistrict(districtName) {
        return $(`.present [id=${districtName}]`);
    }


    function assignColorToDistrictWTA(districtName) {
        if (!districtData[districtName])
            debugger
        let { trump, clinton } = districtData[districtName];

        let r = 0, g = 0, b = 0, a;
        if (trump > clinton) {
            r = 255;
 
            a = (trump-clinton)*2;
        } else {
            b = 255;

            a = (clinton-trump)*2;
        }
        
        if (a < 0.15)
            a = 0.15;

        return selectByDistrict(districtName)
            .velocity({
                fill: rgbToHex(r,g,b),
                'stroke-opacity': a,
                'fill-opacity': a
            }, {
                duration: 1000,
                easing: 'easeInSine'
            });
    }

    function assignColorToState(stateName) {
        let { trump, clinton } = stateData[stateName];

        let r = 0, g = 0, b = 0, a;
        if (trump > clinton) {
            r = 255;
 
            a = trump/(trump+clinton);
        } else {
            b = 255;

            a = clinton/(trump+clinton);
        }

        if (a < 0.15)
            a = 0.15;
        
        return selectByState(stateName)
            .velocity({
                fill: rgbToHex(r,g,b),
                'stroke-opacity': a,
                'fill-opacity': a,
                stroke: rgbToHex(r,g,b)
            }, {
                duration: 1000,
                easing: 'easeInSine'
            });
    }

    function highlight(ele) {
        return $(ele).css('stroke', 'grey').velocity({
            'stroke-opacity': 1,
            'stroke-width': '5px'
        }, {
            duration: 1000,
            loop: true,
            easing: 'easeInOutSine'
        });
    }

    function stopHighlight(ele) {
        return $(ele).velocity('stop').velocity('reverse');
    }


    function isolate(ele) {
        return $('path').not(ele).velocity({
            opacity: '0'
        });
    }

    function assignColorsToDistrictsInState(stateName) {
        if (stateName === 'DC') return;

        return stateData[stateName].districts.map((district) => assignColorToDistrictWTA(district.district));
    }

    window.isolate = isolate

    const fns = {
        wta: function (event) {
            for (const stateName in stateData) {
              assignColorToState(stateName);
            }
        },
        'ne-me': function (event) {
            for (const stateName in stateData) {
                if (!['NE', 'ME'].includes(stateName))
                    assignColorToState(stateName);
            }
            for (const stateName of ['NE', 'ME']) {
                for (const e of assignColorsToDistrictsInState(stateName)) {
                    highlight(e);
                }
            }
            
        },
        'ne-me-zoom': function () {
            assignColorsToDistrictsInState('NE')
            assignColorsToDistrictsInState('ME')

            const targets = selectByState('NE', 'ME');
            const faded = isolate(targets);
            
            selectByState('ME').velocity({
                scale: 3,
                translateX: -830,
                translateY: 0
            });

            selectByState('NE').velocity({
                scale: 3,
                translateX: -500,
                translateY: -200
            });
        
        },
        'cd': function () {
            for (const stateName in stateData) {
                assignColorsToDistrictsInState(stateName);
            }
        },
        'tx': function () {
            assignColorsToDistrictsInState('TX');

            const targets = selectByState('TX');
            const faded = isolate(targets);
            
            selectByState('TX').velocity({
                scale: 2.25,
                translateX: -350,
                translateY: -425
            });
        },
        'ny': function () {
            assignColorsToDistrictsInState('NY');

            const targets = selectByState('NY');
            const faded = isolate(targets);
            
            selectByState('NY').velocity({
                scale: 6,
                translateX: -1000,
                translateY: -100
            });
        },
    }

    const existingMaps = {};
    Reveal.addEventListener('slidechanged', (event) => {
        if ($('[data-map]', event.previousSlide.length)) {
            for (const mapEle of $('[data-map]', event.previousSlide)) {
                const mapName = $(mapEle).attr('data-map');

                existingMaps[mapName] = $(event.previousSlide)[0].hasAttribute('data-fresh-map') ? void(0) : mapEle;
                
                $(mapEle).replaceWith(`<svg data-map="${mapName}"></svg>`)
            }
        }

        for (const mapEle of $('[data-map]', event.currentSlide)) {
            const mapName = $(mapEle).attr('data-map');
            
            let map = $(event.currentSlide)[0].hasAttribute('data-fresh-map') ? void(0) : existingMaps[mapName];
            if (!map) {
                map = $(maps[mapName]).clone();
                map.attr('data-map', mapName);
            }

            $(mapEle).replaceWith(map);

        }

        setTimeout(() => {
            if (fns[$(event.currentSlide).attr('data-slide-fn')]) {
                fns[$(event.currentSlide).attr('data-slide-fn')].call(event.currentSlide, event);
            }
        }, 0);
    });
    
    Reveal.initialize({
        dependencies: [
		    { src: '/lib/zoom.js', async: true },
        ]
    });

    window.$ = $;
    window.assignColorToDistrictWTA = assignColorToDistrictWTA
})();