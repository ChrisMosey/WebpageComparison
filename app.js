const chrome = require('chrome-remote-interface');
const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');

let targets = argv.url || require("./websites.json");
const full = argv.full || false;

const viewport = [1440, 900];
const screenshotDelay = 2000; // ms

if (typeof(targets) != "array") {
    let type = "first page";
    if (full) {
        type = "full";
    }

    targets = [{
        url: targets,
        captureType: type
    }];
}

if (full) {
    console.log("will capture full page")
}

chrome(async(client) => {
    const { DOM, Emulation, Network, Page, Runtime } = client;

    // Enable events on domains we are interested in.
    await Page.enable();
    await DOM.enable();
    await Network.enable();

    // change these for your tests or make them configurable via argv
    var device = {
        width: viewport[0],
        height: viewport[1],
        deviceScaleFactor: 0,
        mobile: false,
        fitWindow: false
    };

    // set viewport and visible size
    await Emulation.setDeviceMetricsOverride(device);
    await Emulation.setVisibleSize({ width: viewport[0], height: viewport[1] });

    targets.forEach((target) => {
        await Page.navigate({ url: target });

        Page.loadEventFired(async() => {
            if (fullPage) {
                const { root: { nodeId: documentNodeId } } = await DOM.getDocument();
                const { nodeId: bodyNodeId } = await DOM.querySelector({
                    selector: 'body',
                    nodeId: documentNodeId,
                });

                const { model: { height } } = await DOM.getBoxModel({ nodeId: bodyNodeId });

                // extend the viewport to display complete page
                await Emulation.setVisibleSize({ width: device.width, height: height });
                await Emulation.forceViewport({ x: 0, y: 0, scale: 1 });
            }
        });

        setTimeout(async() => {
            const screenshot = await Page.captureScreenshot({ format: "png", fromSurface: true });
            const buffer = new Buffer(screenshot.data, 'base64');
            fs.writeFile('desktop.png', buffer, 'base64', (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log('Screenshot saved');
                }
            });
            client.close();
        }, screenshotDelay);

    }, this);

}).on('error', err => {
    console.error('Cannot connect to browser:', err);
});