const fs = require('fs');
const express = require('express');
const request = require('request').defaults({ encoding: null });
const Canvas = require('canvas-prebuilt');
const Image = Canvas.Image;
const app = express();
const bodyParser = require('body-parser');

// default options
app.use(bodyParser.json());
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Content-Type', 'application/json');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    } else {
        next();
    }
});


app.get('/getqrcode', function (req, res) {
    const imageURL = 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=' + req.query.url;

    request({
        url: imageURL,
        encoding: 'binary'
    }, function (err, response, buffer) {
        let type = response.headers["content-type"];
        let prefix = "data:" + type + ";base64,";
        let base64 = new Buffer(buffer, 'binary').toString('base64');
        let dataURI = prefix + base64;

        const pattRatio = 0.5;
        const whiteMargin = 0.1;
        const blackMargin = (1 - 2 * whiteMargin) * ((1 - pattRatio) / 2);
        const innerMargin = whiteMargin + blackMargin;

        let canvas = new Canvas;
        let context = canvas.getContext('2d');
        canvas.width = canvas.height = 512;

        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // copy image on canvas
        context.fillStyle = 'black';
        context.fillRect(
            whiteMargin * canvas.width,
            whiteMargin * canvas.height,
            canvas.width * (1 - 2 * whiteMargin),
            canvas.height * (1 - 2 * whiteMargin)
        );

        // clear the area for innerImage (in case of transparent image)
        context.fillStyle = 'white';
        context.fillRect(
            innerMargin * canvas.width,
            innerMargin * canvas.height,
            canvas.width * (1 - 2 * innerMargin),
            canvas.height * (1 - 2 * innerMargin)
        );

        let innerImage = new Image;
        let canvasDataURL;
        innerImage.onload = function () {
            // draw innerImage
            context.drawImage(innerImage,
                innerMargin * canvas.width,
                innerMargin * canvas.height,
                canvas.width * (1 - 2 * innerMargin),
                canvas.height * (1 - 2 * innerMargin)
            );

            canvasDataURL = canvas.toDataURL()
            console.log('Image has loaded!');
        };
        innerImage.src = dataURI;

        encodeImage(dataURI);

        let base64Img = canvasDataURL.split(",")[1];
        let fullMarkerImage = new Buffer(base64Img, 'base64');

        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': fullMarkerImage.length
        });

        res.end(fullMarkerImage);
        console.log('Full marker generated!');
    });
});

app.listen(process.env.PORT || 8888, function () {
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});

function encodeImage(dataURI) {
    console.log('encodeImage');
    var image = new Image;
    image.onload = function () {
        console.log('Encoded Image loaded');
        // copy image on canvas
        var canvas = new Canvas;
        var context = canvas.getContext('2d')
        canvas.width = 16;
        canvas.height = 16;

        // document.body.appendChild(canvas)
        // canvas.style.width = '200px'


        var patternFileString = ''
        for (var orientation = 0; orientation > -2 * Math.PI; orientation -= Math.PI / 2) {
            // draw on canvas - honor orientation
            context.save();
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.translate(canvas.width / 2, canvas.height / 2);
            context.rotate(orientation);
            context.drawImage(image, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
            context.restore();

            // get imageData
            var imageData = context.getImageData(0, 0, canvas.width, canvas.height)

            // generate the patternFileString for this orientation
            if (orientation !== 0) patternFileString += '\n'
            // NOTE bgr order and not rgb!!! so from 2 to 0
            for (var channelOffset = 2; channelOffset >= 0; channelOffset--) {
                // console.log('channelOffset', channelOffset)
                for (var y = 0; y < imageData.height; y++) {
                    for (var x = 0; x < imageData.width; x++) {

                        if (x !== 0) patternFileString += ' '

                        var offset = (y * imageData.width * 4) + (x * 4) + channelOffset
                        var value = imageData.data[offset]

                        patternFileString += String(value).padStart(3);
                    }
                    patternFileString += '\n'
                }
            }
        }

        fs.writeFile('./pattern/pattern-marker.patt', patternFileString, (err) => {
            if (err) {
                throw err;
            }
            console.log('The pattern has been generated!');
        });
    }
    image.src = dataURI;
};