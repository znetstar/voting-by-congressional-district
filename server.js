const express = require('express');
const path = require('path');
const { Server: HTTPServer } = require('http');

const app = express();
const httpServer = new HTTPServer(app);

app.use(express.static(path.join( __dirname, 'dist' )));

const port = Number(process.env.PORT) || 3000;

httpServer.listen(port, (err) => {
    if (err) {
        console.error(`error binding to port ${err.message}`);
        process.exit(0);
    }

    console.log(`listening on port ${port}...`);
});