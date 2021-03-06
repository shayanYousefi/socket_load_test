import {io} from "socket.io-client";
import yargs from 'yargs';

yargs(process.argv.slice(2)).command('*', '', {
    'address': {
        alias: 'a',
        type: 'string'
    },
    'max_client': {
        alias: 'mc',
        type: 'number',
    },
    'polling_percentage': {
        alias: 'pp',
        type: 'number',
    },
    'client_creation_interval': {
        alias: 'cci',
        type: 'number',
    },
    'emit_message_interval': {
        alias: 'emi',
        type: 'number'
    }
}, argv => {

    const URL = argv.address as string;
    const MAX_CLIENTS = argv.max_client as number || 5;
    const POLLING_PERCENTAGE = (argv.polling_percentage as number) / 100 || 0.01;
    const CLIENT_CREATION_INTERVAL_IN_MS = argv.client_creation_interval || 10;
    const EMIT_INTERVAL_IN_MS = argv.emit_message_interval || 4000;

    let clientCount = 0;
    let lastReport = new Date().getTime();
    let packetsSinceLastReport = 0;
    let disCount = 0;

    const createClient = () => {
        // for demonstration purposes, some clients stay stuck in HTTP long-polling
        const transports =
            Math.random() < POLLING_PERCENTAGE ? ["polling"] : ["polling", "websocket"];

        const socket = io(URL, {
            transports,
            auth: {
                token: '12321',
                examId: '129387192839'
            }
        });

        setInterval(() => {
            socket.emit("pingServer", {
                message: 'new event',
                socket: socket.id
            });
        }, EMIT_INTERVAL_IN_MS);

        socket.on("messageChannel", (msg) => {
            packetsSinceLastReport++;
        });

        socket.on('question.file-link:update', (msg) => {
            console.log('got new link', msg)
        })

        socket.on(`newConnection`,(msg)=>{
            console.log(msg)
        })

        socket.on("disconnect", (reason) => {
            console.log(`disconnect due to ${reason}`);
            disCount++;
        });

        if (++clientCount < MAX_CLIENTS) {
            setTimeout(createClient, CLIENT_CREATION_INTERVAL_IN_MS);
        }
    };

    createClient();

    const printReport = () => {
        const now = new Date().getTime();
        const durationSinceLastReport = (now - lastReport) / 1000;
        const packetsPerSeconds = (
            packetsSinceLastReport / durationSinceLastReport
        ).toFixed(2);

        console.log(
            `[${(new Date()).toTimeString()}] client count:${clientCount}; average packets received per second:${packetsPerSeconds}; disconnect count: ${disCount}`
        );
        packetsSinceLastReport = 0;
        lastReport = now;
    };

    setInterval(printReport, 5000);
}).argv
