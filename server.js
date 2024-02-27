/*
 * Eseguire il server in modalità prod:
 * NODE_ENV=production pm2 start server.js --name server_prod
 * Eseguire il server in modalità sviluppo:
 * NODE_ENV=development pm2 start server.js --name server_dev
 * */

// Importa osmtogeojson utilizzando require
const osmtogeojson = require("osmtogeojson");

const turf = require("@turf/turf");
const turfFunctions = {...turf};
const CircularJSON = require('circular-json');

// Importa funzioni specifiche da @turf/turf utilizzando require
/*const {
    intersect,search_films
    booleanWithin,
    booleanContains,
    booleanPointInPolygon,
    booleanCrosses,
    lineString,
    bbox,
    polygon,
    lineOverlap
} = require("@turf/turf");*/

const axios = require('axios');
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const {parse} = require("url");
const NodeCache = require('node-cache');
const cache = new NodeCache();

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') {
    throw new Error("Cannot start the server. NODE_ENV must be 'production' if you want to run the production version, or 'development' if you want to run development version");
}

const production = process.env.NODE_ENV === 'production';

//const production = true;
const functions = require("./composeFilmQuery");
const locusFunctions = require("./composeLocusQuery");
const cron = require('node-cron');

const app = express();
const cors = require("cors");

// Imposta il limite della dimensione del corpo della richiesta a 50 MB
app.use(bodyParser.json({limit: '50mb'}));
// Nel codice del server (Node.js con Express, ad esempio)
app.use(function (req, res, next) {
    //res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Expose-Headers", "X-Total-Results");
    next();
});

const portNumber = production ? 3004 : 3003;
const dbname = production ? "omekas_production_db" : "omekas_db";

var updatingRelationships = false;

/*
const corsOptions = {
    origin: '*', // Sostituisci con l'URL del tuo frontend
};

app.use(cors(corsOptions));
*/

/*
// Middleware per il caching
const cacheMiddleware = (req, res, next) => {
    console.log("ENTRO IN CACHE");
    const key = req.originalUrl || req.url; // Chiave basata sull'URL della richiesta

    // Se la richiesta è di tipo POST e contiene un body JSON
    if (req.method === 'POST' && req.body) {
        const bodyParams = JSON.stringify(req.body);
        const cacheKey = key + bodyParams; // Aggiungi i parametri del body all'URL
        console.log("cacheKey");
        console.log(cacheKey);

        const cachedResponse = cache.get(cacheKey);

        if (cachedResponse) {
            console.log("RISPOSTA IN CACHE");
            console.log(cachedResponse);
            // Se la risposta è presente nella cache, restituiscila
            return res.send(JSON.parse(cachedResponse));
        } else {
            console.log("RISPOSTA NON IN CACHE: " + cacheKey);

            // Altrimenti, procedi con la richiesta e memorizza la risposta nella cache
            res.sendResponse = res.send;
            res.send = (body) => {
                console.log("STO SALVANDO IN CACHE LA RICHIESTA");
                cache.set(cacheKey, body, 600); //600 secondi: 10 minuti -> poi il dato salvato diventa obsoleto
                res.sendResponse(body);
            };
            console.log("CHIAMO NEXT");
            next();
        }
    } else if (req.method === 'GET' && Object.keys(req.query).length === 0) {
        console.log("SONO IN UNA GET");
        // Se la richiesta è di tipo GET senza parametri
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            console.log("LA RISPOSTA E' IN CACHE: " + key);
            // Se la risposta è presente nella cache, restituiscila
            return res.send(JSON.parse(cachedResponse));
        } else {
            console.log("LA RISPOSTA NON E' IN CACHE");
            res.sendResponse = res.send;
            res.send = (body) => {
                console.log("STO SALVANDO IN CACHE LA RICHIESTA");
                cache.set(key, body, 600); //600 secondi: 10 minuti -> poi il dato salvato diventa obsoleto
                res.sendResponse(body);
            };
            next(); // Passa al prossimo middleware se la risposta non è presente nella cache
        }
    } else {
        next(); // Passa al prossimo middleware se non soddisfa nessuna delle condizioni sopra
    }
};
*/

/*
const cacheMiddleware = (req, res, next) => {
    console.log("ENTRO IN CACHE");
    const key = req.originalUrl || req.url; // Chiave basata sull'URL della richiesta

    // Se la richiesta è di tipo POST e contiene un body JSON
    if (req.method === 'POST' && req.body) {
        const bodyParams = JSON.stringify(req.body);
        const cacheKey = key + bodyParams; // Aggiungi i parametri del body all'URL
        console.log("cacheKey");
        console.log(cacheKey);

        const cachedResponse = cache.get(cacheKey);

        if (cachedResponse) {
            console.log("RISPOSTA IN CACHE");
            console.log(cachedResponse);
            var cachedResponseObject = JSON.parse(cachedResponse);
            var totalResults = null;
            if (Array.isArray(cachedResponseObject)) {
                console.log("CACHE POST - CALCOLO TOTAL RESULTS: " + totalResults)
                totalResults = cachedResponseObject.length;
                cachedResponseObject = null;
            } else {
                console.log("CACHE POST - NON CALCOLO TOTAL RESULTS PERCHE' NON E' UN ARRAY");
            }
            // Se la risposta è presente nella cache, restituisci solo la parte richiesta
            return sendPaginatedResponse(res, cachedResponseObject, req.query.page || 1, totalResults);
        } else {
            console.log("RISPOSTA NON IN CACHE MANNAGGIA");

            // Altrimenti, procedi con la richiesta e memorizza la risposta nella cache
            res.sendResponse = res.send;
            res.send = (body) => {
                console.log("STO SALVANDO IN CACHE LA RICHIESTA");
                cache.set(cacheKey, body, 600); // 600 secondi: 10 minuti -> poi il dato salvato diventa obsoleto

                var bodyObject = JSON.parse(body);
                var totalResults = null;
                if (Array.isArray(bodyObject)) {
                    console.log("POST - CALCOLO TOTAL RESULTS: " + totalResults);
                    totalResults = bodyObject.length;
                } else {
                    console.log("POST - NON CALCOLO TOTAL RESULTS PERCHE' NON E' UN ARRAY");
                }
                // Restituisci solo la parte richiesta anche quando la risposta non è in cache
                sendPaginatedResponse(res, bodyObject, req.query.page || 1, totalResults);
            };
            console.log("CHIAMO NEXT");
            next();
        }
    } else if (req.method === 'GET' && Object.keys(req.query).length === 0) {
        console.log("SONO IN UNA GET");
        // Se la richiesta è di tipo GET senza parametri
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            console.log("LA RISPOSTA E' IN CACHE: " + key);
            // Se la risposta è presente nella cache, restituisci solo la parte richiesta
            var cachedResponseObject = cachedResponse;
            var totalResults = null;
            if (Array.isArray(cachedResponseObject)) {
                console.log("CACHE GET - CALCOLO TOTAL RESULTS: " + totalResults);
                totalResults = cachedResponseObject.length;
                //cachedResponseObject = null;
            } else {
                console.log("CACHE GET - NON CALCOLO TOTAL RESULTS PERCHE' NON E' UN ARRAY");
            }
            return sendPaginatedResponse(res, cachedResponseObject, req.query.page || 1, totalResults);
        } else {
            console.log("LA RISPOSTA NON E' IN CACHE");
            res.sendResponse = res.send;
            res.send = (body) => {
                console.log("ENTRO QUA PER GESTIRE LA RISPOSTA, stampo res.headersSent");
                console.log(res.headersSent);
                if (!res.headersSent) {
                    console.log("\n\n\nSTO SALVANDO IN CACHE LA RICHIESTA\n\n");
                    cache.set(key, body, 600); // 600 secondi: 10 minuti -> poi il dato salvato diventa obsoleto
                    // Restituisci solo la parte richiesta anche quando la risposta non è in cache

                    console.log(body);

                    var bodyObject = body;
                    var totalResults = null;
                    if (Array.isArray(bodyObject)) {
                        totalResults = bodyObject.length;
                        console.log("GET - CALCOLO TOTAL RESULTS: " + totalResults);
                        //bodyObject = null;
                    } else {
                        console.log("GET - NON CALCOLO TOTAL RESULTS PERCHE' NON E' UN ARRAY");
                    }

                    sendPaginatedResponse(res, bodyObject, req.query.page || 1, totalResults);
                } else {
                    console.log("\n\nRISPOSTA GIA' INVIATA");
                }
            };
            console.log("CHIAMO NEXT IN GET NON IN CACHE");
            next(); // Passa al prossimo middleware se la risposta non è presente nella cache
        }
    } else {
        next(); // Passa al prossimo middleware se non soddisfa nessuna delle condizioni sopra
    }
};
*/

const cacheMiddleware = (req, res, next) => {
    console.log("ENTRO IN cacheMiddleware");
    const key = '__express__' + req.originalUrl || req.url;
    var cacheKey = key.replace(/\?page=\d+/, '');
    console.log("CACHE KEY PRIMA");
    console.log(cacheKey);

    if (req.method === 'POST' && req.body) {
        const bodyParams = JSON.stringify(req.body);
        cacheKey = cacheKey + bodyParams; // Aggiungi i parametri del body all'URL
    }

    console.log("CACHE KEY DOPO");
    console.log(cacheKey);

    //console.log("CACHE KEY");
    //console.log(cacheKey);

    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        console.log("DATI IN CACHE");
        // Se i dati sono presenti nella cache, inviali direttamente
        //res.send(cachedData);
        var cachedDataObj = JSON.parse(cachedData);
        var totalResults = null;
        if (Array.isArray(cachedDataObj)) {
            totalResults = cachedDataObj.length;
            console.log("CACHE GET - CALCOLO TOTAL RESULTS: " + totalResults);
            sendInCachePaginatedResponse(req, res, cachedDataObj, req.query.page, totalResults);
        } else {
            console.log("CACHE GET - NON CALCOLO TOTAL RESULTS PERCHE' NON E' UN ARRAY");
            res.send(cachedDataObj);
        }

    } else {
        console.log("DATI NON IN CACHE");

        // Altrimenti, continua con l'esecuzione normale e salva i dati nella cache successivamente
        res.sendResponse = res.send;
        res.send = (body) => {
            console.log("INTERCETTO LA RISPOSTA E SALVO IN CACHE");
            cache.set(cacheKey, body, 600); // Salva i dati in cache con il timeout di 600 secondi, ovvero 10 minuti

            //console.log(body);

            body = JSON.parse(body);

            var totalResults = null;
            if (Array.isArray(body)) {
                totalResults = body.length;
                console.log("NON IN CACHE GET - CALCOLO TOTAL RESULTS: " + totalResults);
                sendNotInCachePaginatedResponse(req, res, body, req.query.page, totalResults);
            } else {
                console.log("NON IN CACHE GET - NON CALCOLO TOTAL RESULTS PERCHE' NON E' UN ARRAY");
                res.sendResponse(JSON.stringify(body));
            }

            console.log("CHIAMO sendNotInCachePaginatedResponse");


            //res.sendResponse(body);
        };
        console.log("CHIAMO NEXT");
        next();
    }
};

const defaultPageSize = 20;

const sendInCachePaginatedResponse = (req, res, data, page, totalResults) => {
    console.log("SONO IN SEND PAGINATED RESPONSE");
    console.log("totalResults: " + totalResults);

    if (page !== null && page !== "null") {
        console.log("page: " + page);
        console.log("data: " + data.length);
        //console.log(data);

        console.log("req.query.per_page");
        console.log(req.query.per_page);
        console.log(parseInt(req.query.per_page));
        var pageSize = req.query.per_page !== undefined && req.query.per_page !== null && req.query.per_page !== "null" ? parseInt(req.query.per_page) : defaultPageSize;

        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        console.log("start index: " + startIndex);
        console.log("end index: " + endIndex);

        const paginatedData = data.slice(startIndex, endIndex);
        console.log("paginatedData length: " + paginatedData.length);
        res.setHeader('X-Total-Results', totalResults); // Aggiungi l'intestazione personalizzata
        res.send(paginatedData);
    } else {
        res.setHeader('X-Total-Results', data.length); // Aggiungi l'intestazione personalizzata
        res.send(data);
    }
};

const sendNotInCachePaginatedResponse = (req, res, data, page, totalResults) => {
        console.log("SONO IN SEND PAGINATED RESPONSE");
        console.log("totalResults: " + totalResults);

        if (page !== null && page !== "null") {
            console.log("page: " + page);
            console.log("data: " + data.length);
            //console.log(data);

            console.log("req.query.per_page");
            console.log(req.query.per_page);
            console.log(parseInt(req.query.per_page));
            var pageSize = req.query.per_page !== undefined && req.query.per_page !== null && req.query.per_page !== "null" ? parseInt(req.query.per_page) : defaultPageSize;


            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;

            console.log("start index: " + startIndex);
            console.log("end index: " + endIndex);

            const paginatedData = data.slice(startIndex, endIndex);
            console.log("paginatedData length: " + paginatedData.length);
            res.setHeader('X-Total-Results', totalResults); // Aggiungi l'intestazione personalizzata
            console.log("Ho impostato l'header, ora invio la risposta");
            res.sendResponse(JSON.stringify(paginatedData));
            //res.send(paginatedData);
        } else {
            res.setHeader('X-Total-Results', totalResults); // Aggiungi l'intestazione personalizzata
            res.sendResponse(JSON.stringify(data));
        }
    }
;


app.get("/server/overview", (req, res) => {
    res.send('Welcome to the "overview page" of the nginX project');
});

app.get("/server/jsontest", (req, res) => {
    res.json({
        product_id: "xyz12u3", product_name: "NginX injector",
    });
});

app.get("/server/get_all_films_db", express.json(), cacheMiddleware, (req, res) => {
    getAllFilmsDB(res);
});

app.get("/server/get_all_films_homepage_db", express.json(), cacheMiddleware, (req, res) => {
    getAllFilmsHomepageDB(res);
});

app.get("/server/get_all_locus_homepage_db", express.json(), cacheMiddleware, (req, res) => {
    getAllLocusHomepageDB(res);
});

app.get("/server/get_schede_av_of_film", express.json(), cacheMiddleware, (req, res) => {
    getSchedeAVofFilm(res, req);
});

app.post("/server/get_unita_catalografiche_of_film", express.json(), cacheMiddleware, (req, res) => {
    getUnitaCatalograficheOfFilm(res, req);
});

app.post("/server/get_schede_luoghi_of_uc", express.json(), cacheMiddleware, (req, res) => {
    getSchedeRappresentazioneLuoghiOfUnitaCatalografica(res, req);
});

app.post("/server/get_all_locus_related_to_one", express.json(), cacheMiddleware, (req, res) => {
    getAllLocusRelatedToOne(res, req);
});

app.get("/server/get_film_filters", express.json(), cacheMiddleware, (req, res) => {
    getFilmFilters(res);
});

app.get("/server/get_locus_types", express.json(), cacheMiddleware, (req, res) => {
    getLocusTypes(res);
});

app.post("/server/search_films", express.json(), (req, res) => {
    searchFilmWrapper(res, req);
});

app.post("/server/search_locus", express.json(), (req, res) => {
    searchLocusWrapper(res, req);
});

app.post("/server/get_rappr_luogo", express.json(), (req, res) => {
    getRapprLuogo(res, req);
});

app.post("/server/get_locus_of_film", express.json(), cacheMiddleware, (req, res) => {
    getLocusOfFilmByFilmID(res, req);
});

app.post("/server/get_locus_name_from_id", express.json(), cacheMiddleware, (req, res) => {
    try {
        const locus_id = req.body.locus_id;
        getLocusNameFromID(locus_id, res);
    } catch (err) {
        console.log(err);
    }
});

app.post("/server/get_films_of_locus", express.json(), cacheMiddleware, (req, res) => {
    getFilmsOfLocusByLocusID(res, req, null, true);
});


app.post("/server/get_uc_with_present_person", express.json(), cacheMiddleware, (req, res) => {
    getUCofFilmWithPresentPerson(res, req);
})

app.post("/server/get_resource_from_id", express.json(), cacheMiddleware, (req, res) => {
    try {
        const resource_id = req.body.resource_id;
        getResourceFromID([resource_id], res);
    } catch (err) {
        console.log(err);
    }
});

//POST necessaria per ovviare il problema delle strutture circolari nelle relazioni dei luoghi quando si chiede una scheda rappresentazione luogo
app.post("/server/get_rappr_luogo_from_id", express.json(), cacheMiddleware, (req, res) => {
    try {
        const resource_id = req.body.resource_id;
        getRapprLuogoFromID([resource_id], res);
    } catch (err) {
        console.log(err);
    }
});

//POST necessaria per ovviare il problema delle strutture circolari nelle relazioni dei luoghi quando si chiede una scheda locus
app.post("/server/get_scheda_locus_from_id", express.json(), cacheMiddleware, (req, res) => {
    try {
        const resource_id = req.body.resource_id;
        getSchedaLocusFromID([resource_id], res);
    } catch (err) {
        console.log(err);
    }
});

//POST necessaria per ovviare il problema delle strutture circolari nelle relazioni dei luoghi quando si chiede una scheda locus
app.post("/server/get_locus_relationships_from_id", express.json(), cacheMiddleware, (req, res) => {
    try {
        const resource_id = req.body.resource_id;
        getLocusRelationshipsFromID([resource_id], res);
    } catch (err) {
        console.log(err);
    }
});

app.post("/server/get_rappr_luogo_locus_filters", express.json(), cacheMiddleware, (req, res) => {
    getRapprLuogoFilmFilters(res, req);
})


app.get("/", (req, res) => {
    console.log("ORA INVIO LA RISPOSTA");
    res.send("Successfully started a server");
});


//----------PARTE NUOVA----------

let locusRelationshipsDictionary = {};
let locusOverTimeRelationshipsDictionary = {};

// Configurazione del tuo database
const connection = mysql.createConnection({
    user: 'root', host: 'localhost', database: dbname, password: 'omekas_prin_2022', port: 3306, // Porta di default di PostgreSQL
});

// Connessione al database e ottenimento della mappa dei luoghi
connection.connect(async (err) => {
    if (err) {
        console.error('Errore durante la connessione al database:', err);
        return;
    }
    console.log('Connesso al database MariaDB');


    try {
        console.log("Ottengo le strutture dati");
        // Ottieni entrambe le strutture dati prima di avviare il server
        const [locusRelationships, locusOverTimeRelationships] = await Promise.all([getLocusRelationships(connection), getLocusOverTimeRelationships(connection)]);

        console.log("Strutture dati ottenute");
        locusRelationshipsDictionary = locusRelationships;
        locusOverTimeRelationshipsDictionary = locusOverTimeRelationships;

        var prom = createOrUpdateRelationhipsTables(locusRelationshipsDictionary, locusOverTimeRelationshipsDictionary, connection);

        prom.then(() => {
            console.log('Promise risolta con successo senza parametri.');

            //Resetto i dizionari
            locusRelationshipsDictionary = null;
            locusOverTimeRelationshipsDictionary = null;

            // Avvia il server Express solo dopo aver ottenuto entrambe le strutture dati
            const server = app.listen(portNumber, "localhost", () => {
                connection.end();
                console.log("Connessione chiusa");

                console.log("Server in ascolto sulla porta " + portNumber);
                console.log("DB name: " + dbname);


                // Schedula l'esecuzione del metodo alle 3 di notte (alle 3:00 AM)
                cron.schedule('0 3 * * *', updateData);

                // Aggiornamento delle strutture dati ogni tot millisecondi (ad esempio ogni 24 ore)
                //const intervalInMilliseconds = 360000; //1 * 60 * 60 * 1000; // 24 ore
                //setInterval(updateData, intervalInMilliseconds);
            });
            //server.setTimeout(500000);
            server.timeout = 120000;
            console.log("Ho messo il timeout");
            //server.keepAliveTimeout = 120000; // Ensure all inactive connections are terminated by the ALB, by setting this a few seconds higher than the ALB idle timeout
            //server.headersTimeout = 120000; // Ensure the headersTimeout is set higher than the keepAliveTimeout due to this nodejs regression bug: https://github.com/nodejs/node/issues/27363

            // Aggiornamento delle strutture dati ogni tot millisecondi (ad esempio ogni 24 ore)
            //const intervalInMilliseconds = 7 * 60 * 60 * 1000; //1 * 60 * 60 * 1000; // 24 ore
            //setInterval(updateData, intervalInMilliseconds);

        }).catch((errore) => {
            console.error('Si è verificato un errore:', errore);
        });
    } catch (error) {
        console.error('Errore durante il recupero delle strutture dati:', error);
    }
});

const metodoDaEseguire = () => {
    try {
        // Inserisci qui la logica del metodo che vuoi eseguire
        console.log('Il metodo è stato eseguito alle 3 di notte!');
        // Esempio di lancio di un errore per test
        // throw new Error('Errore durante l\'esecuzione del metodo.');
    } catch (error) {
        console.error('Errore durante l\'esecuzione del metodo:', error);
        // Puoi gestire l'errore qui, ad esempio inviando una notifica o registrandolo
    }
};

function createOrUpdateRelationhipsTables(locusRelationshipsDictionary, locusOverTimeRelationshipsDictionary, connection) {
    //TODO: scrivere commento per ogni query nell'array!
    const queries = [`START TRANSACTION;`,

        `DROP TABLE IF EXISTS table_join_free_type;`,

        `DROP TABLE IF EXISTS LocusRelationshipsNew;`,

        `DROP TABLE IF EXISTS LocusRelationships;`,

        `DROP TABLE IF EXISTS LocusOverTimeRelationships;`,

        `DROP TEMPORARY TABLE IF EXISTS tabella_unica;`,

        `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
        SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value, rc.local_name AS resource_class
        FROM value v
                 JOIN property p ON v.property_id = p.id JOIN resource r ON v.resource_id = r.id JOIN resource_class rc ON r.resource_class_id = rc.id;
        ;`,

        `CREATE TABLE IF NOT EXISTS LocusRelationships (
                                    ID INT PRIMARY KEY,
                                    Lista_id_connessi TEXT
            );`,

        `CREATE TABLE IF NOT EXISTS LocusRelationshipsNew (
                                    ID_PARENT INT,
                                    ID_CHILD INT,
                                    PRIMARY KEY (ID_PARENT, ID_CHILD)
            );`,

        `CREATE TABLE IF NOT EXISTS LocusOverTimeRelationships (
                                    ID INT PRIMARY KEY,
                                    Lista_id_connessi TEXT
            );`,

        `CREATE TABLE IF NOT EXISTS LocusOverTimeRelationshipsNew (
                                    ID_PARENT INT,
                                    ID_CHILD INT,
                                    PRIMARY KEY (ID_PARENT, ID_CHILD)
                                   
            );`,


        `CREATE TABLE IF NOT EXISTS table_join_free_type AS
        SELECT t1.resource_id
        FROM tabella_unica t1
        LEFT JOIN tabella_unica t2 ON t2.resource_id = t1.value_resource_id
        LEFT JOIN tabella_unica caratterizzazione_base ON t1.resource_id = caratterizzazione_base.resource_id
        LEFT JOIN tabella_unica tipi ON caratterizzazione_base.value_resource_id = tipi.resource_id
        LEFT JOIN tabella_unica tipolibero ON tipi.value_resource_id = tipolibero.resource_id
        WHERE t1.resource_class = "LocusCatalogueRecord";`,

        `CREATE TABLE IF NOT EXISTS table_join_type_name AS
        SELECT t1.resource_id
        FROM tabella_unica t1
         LEFT JOIN tabella_unica t2 ON t2.resource_id = t1.value_resource_id
         LEFT JOIN tabella_unica caratterizzazione_base ON t1.resource_id = caratterizzazione_base.resource_id
         LEFT JOIN tabella_unica tipi ON caratterizzazione_base.value_resource_id = tipi.resource_id
         LEFT JOIN tabella_unica tipoiri ON tipi.value_resource_id = tipoiri.resource_id
         LEFT JOIN tabella_unica nometipo ON tipoiri.value_resource_id = nometipo.resource_id
        WHERE t1.resource_class = "LocusCatalogueRecord";`,

        `CREATE TABLE IF NOT EXISTS table_join_locus_over_time_free_type AS
        SELECT t1.resource_id AS t1_resource_id, t1.local_name AS t1_local_name, t1.value_resource_id AS t1_value_resource_id, t1.value AS t1_value, t1.resource_class AS t1_resource_class,
        t2.resource_id AS t2_resource_id, t2.local_name AS t2_local_name, t2.value_resource_id AS t2_value_resource_id, t2.value AS t2_value, t2.resource_class AS t2_resource_class,
        t3.resource_id AS t3_resource_id, t3.local_name AS t3_local_name, t3.value_resource_id AS t3_value_resource_id, t3.value AS t3_value, t3.resource_class AS t3_resource_class,
        tipi.resource_id AS tipi_resource_id, tipi.local_name AS tipi_local_name, tipi.value_resource_id AS tipi_value_resource_id, tipi.value AS tipi_value, tipi.resource_class AS tipi_resource_class,
        tipolibero.resource_id AS tipolibero_resource_id, tipolibero.local_name AS tipolibero_local_name, tipolibero.value_resource_id AS tipolibero_value_resource_id , tipolibero.value AS tipolibero_value, tipolibero.resource_class AS tipolibero_resource_class
        FROM tabella_unica t1
        JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
        JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
        JOIN tabella_unica tipi ON t1.value_resource_id = tipi.resource_id
        JOIN tabella_unica tipolibero ON tipi.value_resource_id = tipolibero.resource_id
        WHERE t1.resource_class = "LocusCatalogueRecord" AND t1.local_name = 'hasLocusOverTimeData'
        AND t2.local_name = 'hasRelationshipsWithLociData'
        AND t3.local_name IN ('locusLocatedIn', 'locusIsPartOf')`,

        `CREATE TABLE IF NOT EXISTS table_join_locus_over_time_type_name AS
        SELECT t1.resource_id AS t1_resource_id, t1.local_name AS t1_local_name, t1.value_resource_id AS t1_value_resource_id, t1.value AS t1_value, t1.resource_class AS t1_resource_class,
        t2.resource_id AS t2_resource_id, t2.local_name AS t2_local_name, t2.value_resource_id AS t2_value_resource_id, t2.value AS t2_value, t2.resource_class AS t2_resource_class,
        t3.resource_id AS t3_resource_id, t3.local_name AS t3_local_name, t3.value_resource_id AS t3_value_resource_id, t3.value AS t3_value, t3.resource_class AS t3_resource_class,
        tipi.resource_id AS tipi_resource_id, tipi.local_name AS tipi_local_name, tipi.value_resource_id AS tipi_value_resource_id, tipi.value AS tipi_value, tipi.resource_class AS tipi_resource_class,
        tipoiri.resource_id AS tipoiri_resource_id, tipoiri.local_name AS tipoiri_local_name, tipoiri.value_resource_id AS tipoiri_value_resource_id, tipoiri.value AS tipoiri_value, tipoiri.resource_class AS tipoiri_resource_class,
        nometipo.resource_id AS nometipo_resource_id, nometipo.local_name AS nometipo_local_name, nometipo.value_resource_id AS nometipo_value_resource_id, nometipo.value AS nometipo_value, nometipo.resource_class AS nometipo_resource_class
        FROM tabella_unica t1
        JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
        JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
        JOIN tabella_unica tipi ON t1.value_resource_id = tipi.resource_id
        JOIN tabella_unica tipoiri ON tipi.value_resource_id = tipoiri.resource_id
        JOIN tabella_unica nometipo ON tipoiri.value_resource_id = nometipo.resource_id
        WHERE t1.resource_class = "LocusCatalogueRecord" AND t1.local_name = 'hasLocusOverTimeData'
        AND t2.local_name = 'hasRelationshipsWithLociData'
        AND t3.local_name IN ('locusLocatedIn', 'locusIsPartOf');`,
    ];

    //Creo la query per locusRelationshipsDictionary
    var queryLocusRelationshipsDictionary = `INSERT INTO LocusRelationships (ID, Lista_id_connessi) VALUES `;

    // Rimuovo la chiave null
    delete locusRelationshipsDictionary["null"];

    let chiavi = Object.keys(locusRelationshipsDictionary);
    console.log("locusRelationshipsDictionary - ECCO QUA");
    console.log(JSON.stringify(locusRelationshipsDictionary));

    console.log("locusOverTimeRelationshipsDictionary - chiavi");
    console.log(JSON.stringify(chiavi));

    chiavi.forEach((chiave, indice) => {

        let valore = [...locusRelationshipsDictionary[chiave]];
        valore.unshift(chiave);

        queryLocusRelationshipsDictionary += `(${chiave}, '${valore}')`;

        if (indice < chiavi.length - 1) {
            queryLocusRelationshipsDictionary += ', ';
        } else {
            queryLocusRelationshipsDictionary += ';';
        }

    });


    //LocusRelationshipsNew

    //Creo la query per locusRelationshipsDictionary
    var queryLocusRelationshipsDictionaryNew = `INSERT INTO LocusRelationshipsNew (ID_PARENT, ID_CHILD) VALUES `;

    chiavi.forEach((chiave, indice) => {

        let valore = locusRelationshipsDictionary[chiave];
        console.log("CHIAVE");
        console.log(chiave);
        console.log("VALORE");
        console.log(valore);

        queryLocusRelationshipsDictionaryNew += `(${chiave}, ${chiave})`;

        var CommaAlreadyAdded = false;
        if (valore.length === 0 && indice < chiavi.length - 1) {
            queryLocusRelationshipsDictionaryNew += ', ';
            CommaAlreadyAdded = true;
        } else {
            if (indice < chiavi.length - 1) {
                queryLocusRelationshipsDictionaryNew += ', ';
            } else {
                queryLocusRelationshipsDictionaryNew += ';';
            }
        }

        if (valore.length > 0) {
            valore.forEach((val, index) => {
                queryLocusRelationshipsDictionaryNew += `(${chiave}, ${val})`;

                if (index < valore.length - 1) {
                    queryLocusRelationshipsDictionaryNew += ', ';
                }
            })
        }

        if (!CommaAlreadyAdded && indice < chiavi.length - 1) {
            queryLocusRelationshipsDictionaryNew += ', ';
        }
        /*if(valore.length === 0 && indice < chiavi.length - 1){
            queryLocusRelationshipsDictionaryNew += ', ';
        } else {
            if (indice < chiavi.length - 1) {
                queryLocusRelationshipsDictionaryNew += ', ';
            } else {
                queryLocusRelationshipsDictionaryNew += ';';
            }
        }*/
        /*
        queryLocusRelationshipsDictionaryNew += `(${chiave}, '${valore}')`;

        if (indice < chiavi.length - 1) {
            queryLocusRelationshipsDictionaryNew += ', ';
        } else {
            queryLocusRelationshipsDictionaryNew += ';';
        }
*/
    });

    console.log("queryLocusRelationshipsDictionaryNew");
    console.log(queryLocusRelationshipsDictionaryNew);


    //Creo la query per locusOverTimeRelationshipsDictionary
    var queryLocusOverTimeRelationshipsDictionary = `INSERT INTO LocusOverTimeRelationships (ID, Lista_id_connessi) VALUES `;

    // Rimuovo la chiave null
    delete locusOverTimeRelationshipsDictionary["null"];

    console.log("locusOverTimeRelationshipsDictionary");
    console.log(JSON.stringify(locusOverTimeRelationshipsDictionary));

    let chiaviOverTime = Object.keys(locusOverTimeRelationshipsDictionary);

    console.log("locusOverTimeRelationshipsDictionary - chiaviOverTime");
    console.log(JSON.stringify(chiaviOverTime));

    chiaviOverTime.forEach((chiave, indice) => {
        let valore = locusOverTimeRelationshipsDictionary[chiave];
        queryLocusOverTimeRelationshipsDictionary += `(${chiave}, '${valore}')`;

        if (indice < chiaviOverTime.length - 1) {
            queryLocusOverTimeRelationshipsDictionary += ', ';
        } else {
            queryLocusOverTimeRelationshipsDictionary += ';';
        }
    });

    if (chiavi.length > 0) {
        queries.push(queryLocusRelationshipsDictionary);
        queries.push(queryLocusRelationshipsDictionaryNew);
    }


    if (chiaviOverTime.length > 0) {
        queries.push(queryLocusOverTimeRelationshipsDictionary);
    }

    queries.push("COMMIT;");

    console.log(queries);


    return new Promise((resolve, reject) => {

        function executeBatchQueries(queries, index) {
            console.log("queries.length: ", queries.length);
            console.log("INDEX: ", index);
            if (index < queries.length) {
                const query = queries[index];
                connection.query(query, (error, queryResults) => {
                    if (error) {
                        console.log("SONO IN ERRORE");
                        connection.rollback(() => {
                            console.error('getLocusRelationships - Errore nell\'esecuzione della query:', error);
                            //connection.end();
                        });
                    } else {
                        //Tutto ok

                        console.log("\n\n\nQuery eseguita con successo");
                        console.log(query);
                    }
                    executeBatchQueries(queries, index + 1);
                });
            } else {
                resolve();
            }
        }

        executeBatchQueries(queries, 0);

    });
}

// Funzione per aggiornare le strutture dati
function updateData() {
    console.log("Aggiorno le strutture dati");

    // Configurazione del tuo database
    const con = mysql.createConnection({
        user: 'root', host: 'localhost', database: dbname, password: 'omekas_prin_2022', port: 3306, // Porta di default di PostgreSQL
    });

    updatingRelationships = true;

    Promise.all([getLocusRelationships(con), getLocusOverTimeRelationships(con)])
        .then(([updatedLocusRelationships, updatedLocuOverTimesRelationships]) => {
            locusRelationshipsDictionary = updatedLocusRelationships;
            locusOverTimeRelationshipsDictionary = updatedLocuOverTimesRelationships;
            //console.log('Strutture dati aggiornate:', updatedLocusRelationships, updatedLocuOverTimesRelationships);
            var prom = createOrUpdateRelationhipsTables(locusRelationshipsDictionary, locusOverTimeRelationshipsDictionary, con);

            prom.then(() => {
                console.log('Promise risolta con successo senza parametri.');

                //Resetto i dizionari
                locusRelationshipsDictionary = null;
                locusOverTimeRelationshipsDictionary = null;

                console.log("Strutture dati aggionate e dizionari impostati a null");

                updatingRelationships = false;

                console.log("Chiudo la connessione dopo updateData");
                con.end();

            }).catch((errore) => {
                console.error('Si è verificato un errore:', errore);
                console.log("Chiudo la connessione dopo un errore in updateData");
                con.end();
            });

        })
        .catch((err) => {
            console.error('Errore durante l\'aggiornamento delle strutture dati:', err);
        });
}

// Funzione per ottenere la mappa dei luoghi ricorsivamente
function getLocusRelationships(connection) {
    return new Promise((resolve, reject) => {
        const queries = [`START TRANSACTION`,

            `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
            SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value
            FROM value v
             JOIN property p ON v.property_id = p.id;`,

            `CREATE TEMPORARY TABLE IF NOT EXISTS locus AS
            SELECT r.id as object_id, rc.id as class_id, rc.local_name as class_name, rc.label FROM resource r join resource_class rc on r.resource_class_id=rc.id WHERE rc.local_name="LocusCatalogueRecord";
            `,

            `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_grande_join_locus_relationships AS (
                SELECT t1.resource_id,
                       t1.property_id,
                       t1.local_name,
                       t1.value_resource_id,
                       t1.value,
                       t2.resource_id                           AS t2_resource_id,
                       t2.property_id                           AS t2_property_id,
                       t2.local_name                            AS t2_local_name,
                       t2.value_resource_id                     AS t2_value_resource_id,
                       t2.value                                 AS t2_value
                FROM tabella_unica t1
                         JOIN tabella_unica t2 ON t2.resource_id = t1.value_resource_id
                  WHERE t1.local_name = "hasRelationshipsWithLociData"
                  and t2.local_name IN ('locusLocatedIn', 'locusIsPartOf')
            );
            `,

            `CREATE TEMPORARY TABLE IF NOT EXISTS locus_relationships_free_type AS
                WITH RECURSIVE RelationsCTE AS (SELECT *
                                                FROM tabella_grande_join_locus_relationships tgj
                                                  WHERE t2_value_resource_id IN (SELECT object_id FROM locus)
                
                                                UNION ALL
                
                                                SELECT tgj.*
                                                FROM tabella_grande_join_locus_relationships tgj
                                                         JOIN RelationsCTE r ON r.resource_id = tgj.value_resource_id
                                                )
                SELECT *
                FROM RelationsCTE;
            `,

            //Questa query fa si che vengano recuperati anche i locus che non hanno nessun a relazione con altri locus, oppure che ce l'hanno, ma con un locus nel tempo e quindi che vengono scartati nella prima riga
            `SELECT resource_id, t2_value_resource_id FROM locus_relationships_free_type WHERE resource_id IN (SELECT object_id FROM locus) AND t2_value_resource_id IN (SELECT object_id FROM locus)
            UNION ALL
            SELECT object_id AS resource_id, NULL AS t2_value_resource_id
            FROM locus
            WHERE
                object_id NOT IN (SELECT resource_id FROM locus_relationships_free_type WHERE resource_id IN (SELECT object_id FROM locus) AND t2_value_resource_id IN (SELECT object_id FROM locus))
              AND
                object_id NOT IN (SELECT t2_value_resource_id FROM locus_relationships_free_type WHERE resource_id IN (SELECT object_id FROM locus) AND t2_value_resource_id IN (SELECT object_id FROM locus));`,

            `COMMIT;`, // Aggiungi altre query qui
        ];

        var results = []; // Array per salvare i risultati della terza query

        function executeBatchQueries(queries, index) {
            if (index < queries.length) {
                const query = queries[index];
                connection.query(query, (error, queryResults) => {
                    if (error) {
                        connection.rollback(() => {
                            console.error('getLocusRelationships - Errore nell\'esecuzione della query:', error);
                            //connection.end();
                        });
                    } else {
                        console.log("getLocusRelationships - Eseguo la query " + index);
                        if (index === 5) { // Verifica se questa è la terza query (l'indice 5)
                            let mappedArray = queryResults.map(item => [item.resource_id, item.t2_value_resource_id]);
                            var dictionary = getDictionary(mappedArray, "getLocusRelationships");
                            results = dictionary;
                        }
                    }
                    executeBatchQueries(queries, index + 1);
                });
            } else {
                resolve(results);
            }
        }

        executeBatchQueries(queries, 0);

    });
}


// Funzione per ottenere la mappa dei luoghi ricorsivamente
function getLocusOverTimeRelationships(connection) {
    return new Promise((resolve, reject) => {


        const queries = [`START TRANSACTION`,

            `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
            SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value
            FROM value v
             JOIN property p ON v.property_id = p.id;`,

            `CREATE TEMPORARY TABLE IF NOT EXISTS locus AS
            SELECT r.id as object_id, rc.id as class_id, rc.local_name as class_name, rc.label FROM resource r join resource_class rc on r.resource_class_id=rc.id WHERE rc.local_name="LocusCatalogueRecord";
            `,

            `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_grande_join_locus_over_time AS (
                SELECT t1.resource_id, t1.property_id, t1.local_name, t1.value_resource_id, t1.value,
                       t2.resource_id AS t2_resource_id, t2.property_id AS t2_property_id,
                       t2.local_name AS t2_local_name, t2.value_resource_id AS t2_value_resource_id, t2.value AS t2_value,
                       t3.resource_id AS t3_resource_id, t3.property_id AS t3_property_id,
                       t3.local_name AS t3_local_name, t3.value_resource_id AS t3_value_resource_id, t3.value AS t3_value,
                       tipi.resource_id AS tipi_resource_id, tipi.property_id AS tipi_property_id,
                       tipi.local_name AS tipi_local_name, tipi.value_resource_id AS tipi_value_resource_id, tipi.value AS tipi_value,
                       tipolibero.resource_id AS tipolibero_resource_id, tipolibero.property_id AS tipolibero_property_id,
                       tipolibero.local_name AS tipolibero_local_name, tipolibero.value_resource_id AS tipolibero_value_resource_id, tipolibero.value AS tipolibero_value
                FROM tabella_unica t1
                         JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
                         JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                         JOIN tabella_unica tipi ON t1.value_resource_id = tipi.resource_id
                         JOIN tabella_unica tipolibero ON tipi.value_resource_id = tipolibero.resource_id
                WHERE t1.local_name = 'hasLocusOverTimeData'
                  AND t2.local_name = 'hasRelationshipsWithLociData'
                  AND t3.local_name IN ('locusLocatedIn', 'locusIsPartOf')
            );
            `,

            `CREATE TEMPORARY TABLE IF NOT EXISTS locus_over_time_free_type AS
                WITH RECURSIVE RelationsCTE AS (
                    SELECT *
                    FROM tabella_grande_join_locus_over_time tgj
                    -- Aggiunta della condizione per la ricorsione
                    WHERE t3_value_resource_id IN (SELECT object_id FROM locus)
                
                    UNION ALL
                
                    SELECT tgj.*
                    FROM tabella_grande_join_locus_over_time tgj
                             JOIN RelationsCTE r ON tgj.t3_value_resource_id = r.resource_id
                )
                SELECT *
                FROM RelationsCTE;
            `,

            `SELECT distinct resource_id, t3_value_resource_id FROM locus_over_time_free_type;`,

            `COMMIT;`, // Aggiungi altre query qui
        ];

        var results = []; // Array per salvare i risultati della terza query

        function executeBatchQueries(queries, index) {
            if (index < queries.length) {
                const query = queries[index];
                connection.query(query, (error, queryResults) => {
                    if (error) {
                        connection.rollback(() => {
                            console.error('getLocusOverTimeRelationships - Errore nell\'esecuzione della query:', error);
                        });
                    } else {
                        console.log("getLocusOverTimeRelationships - Eseguo la query " + index);

                        if (index === 5) { // Verifica se questa è la terza query (l'indice 5)
                            let mappedArray = queryResults.map(item => [item.resource_id, item.t3_value_resource_id]);
                            var dictionary = getDictionary(mappedArray, "getLocusOverTimeRelationships");
                            results = dictionary;
                        }
                    }
                    executeBatchQueries(queries, index + 1);
                });
            } else {
                resolve(results);
            }
        }

        executeBatchQueries(queries, 0);
    });
}

function getRelatedPlaces(result, place, visited = new Set()) {
    let related = result[place] || [];
    visited.add(place);  // Aggiungi il luogo corrente all'insieme di luoghi visitati

    related.forEach(p => {
        if (!visited.has(p)) {  // Verifica se il luogo non è stato visitato per evitare la ricorsione infinita
            related = [...new Set([...related, ...getRelatedPlaces(result, p, visited)])];
        }
    });

    return related;
}


function getDictionary(data, caller) {
    console.log("\n\n\n\nDATA QUA -" + caller);
    console.log(data);
    console.log(JSON.stringify(data));

    let result = {};

    // Costruzione del dizionario
    data.forEach(([place, part_of]) => {
        if (!result[part_of]) {
            result[part_of] = [];
        }
        if (!result[place]) {
            result[place] = [];
        }

        result[part_of].push(place);
    });

    // Aggiunta degli elementi correlati
    Object.keys(result).forEach(place => {
        result[place] = [...new Set(getRelatedPlaces(result, place).filter(p => p !== parseInt(place)))];
    });

    // Aggiunta delle chiavi mancanti con liste vuote
    const allKeys = Array.from(new Set(data.reduce((acc, [a, b]) => acc.concat(a, b), [])));
    allKeys.forEach(key => {
        if (!result[key]) {
            result[key] = [];
        }
    });

    return result;
}


//---------------------

function getResourceFromID(id, res) {
    console.log("ID DA TROVARE");
    console.log(id);

    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });


    var query = `WITH RECURSIVE test as ( 
        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
        FROM value as v1 
        WHERE v1.resource_id IN (${id.join(', ')})
    UNION
    (
      SELECT
        v2.resource_id,
        v2.property_id,
        v2.value_resource_id,
        v2.value,
        v2.uri
      FROM
        value as v2
        INNER JOIN test ON test.value_resource_id = v2.resource_id
    )
  )
  select
    test.resource_id,
    test.property_id,
    test.value_resource_id,
    test.value,
    property.local_name as property_name,
    property.label as property_label,
    vocabulary.prefix as vocabulary_prefix,
    r2.local_name,
    r2.label,
    m.storage_id as media_link,
    test.uri as uri_link
  from
    test
    join property on test.property_id = property.id
    join vocabulary on property.vocabulary_id = vocabulary.id
    join resource as r1 on test.resource_id = r1.id
    join resource_class as r2 on r1.resource_class_id = r2.id
    left join media as m on test.resource_id = m.item_id;`;

    //TODO: mettere blocco try-catch
    console.log("QUERY");
    console.log(query);

    let prom = new Promise((resolve, reject) => {
        con.query(query, (err, rows) => {
            if (err) {
                return reject(err);
            } else {


                let result = Object.values(JSON.parse(JSON.stringify(rows)));
                console.log("RESULTS");
                console.log(result);
                var objectReversed = result.reverse();

                var ids = objectReversed.map(item => item["resource_id"]);

                const setIDs = [...new Set(ids)];

                let object = new Map();

                setIDs.forEach(id => {
                    var objWithCurrentID = objectReversed.filter(obj => obj["resource_id"] === id);
                    object.set(id, objWithCurrentID);
                });

                var arr = {};

                object.forEach((value, key) => {
                    arr[key] = {};
                    value.forEach(property => {

                        var propertyObject = {};
                        var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                        propertyObject[propertyName] = property;

                        if (arr[key][propertyName] === undefined) {
                            arr[key][propertyName] = [property];
                        } else {
                            arr[key][propertyName].push(property);
                        }
                    });

                    object.set(key, arr[key]);
                });

                object.forEach((value, key) => {
                    for (let k in value) {
                        value[k].forEach(prop => {
                            if (prop.value_resource_id !== null) {
                                if (prop.value === undefined || prop.value === null) {
                                    prop.value = [];
                                    prop.value.push(object.get(prop.value_resource_id));
                                } else {
                                    prop.value.push(object.get(prop.value_resource_id));
                                }
                            }
                        });
                    }
                });

                var objectListFinal = null;

                if (id.length === 1) {
                    objectListFinal = object.get(id[0]);
                } else if (id.length > 1) {
                    objectListFinal = [];
                    id.forEach(id_number => {
                        objectListFinal.push(object.get(id_number));
                    });
                }

                resolve({objectListFinal, res});
            }
        });
    });

    return prom.then(function ({objectListFinal, res}) {
        //console.log("HO OTTWNUTO OBJETCT RESOLVE");
        //console.log(objectListFinal);

        if (objectListFinal === undefined) {
            objectListFinal = null;
        }

        con.end();

        if (res) {
            //res.writeHead(200, {"Content-Type": "application/json"});

            /*
            const jsonString = CircularJSON.stringify(objectListFinal);

            // Invia la risposta JSON al client
            res.json(JSON.parse(jsonString));
            */

            res.json(objectListFinal);
        } else {
            return objectListFinal;
        }


    });

    return prom.catch(function (err) {
        con.end();

        if (res) {
            //res.writeHead(200, {"Content-Type": "text"});
            res.json({message: 'Si è verificato un errore nella richiesta'});
        } else {
            return undefined;
        }

    });
};

function getRapprLuogoFromID(id, res) {
    console.log("ID DA TROVARE");
    console.log(id);

    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });


    var query = `WITH RECURSIVE test as ( 
        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
        FROM value as v1 
        WHERE v1.resource_id IN (${id.join(', ')})
    UNION
    (
      SELECT
        v2.resource_id,
        v2.property_id,
        v2.value_resource_id,
        v2.value,
        v2.uri
      FROM
        value as v2
        INNER JOIN test ON test.value_resource_id = v2.resource_id
    )
  )
  select
    test.resource_id,
    test.property_id,
    test.value_resource_id,
    test.value,
    property.local_name as property_name,
    property.label as property_label,
    vocabulary.prefix as vocabulary_prefix,
    r2.local_name,
    r2.label,
    m.storage_id as media_link,
    test.uri as uri_link
  from
    test
    join property on test.property_id = property.id
    join vocabulary on property.vocabulary_id = vocabulary.id
    join resource as r1 on test.resource_id = r1.id
    join resource_class as r2 on r1.resource_class_id = r2.id
    left join media as m on test.resource_id = m.item_id
    where property.local_name NOT IN("hasMapReferenceData", "mapReferenceIRI", "mapReferenceTextualData", "hasRelationshipsWithLociData") and
      r2.local_name NOT IN("FilmUnitCatalogueRecord");`;

    //TODO: mettere blocco try-catch
    console.log("QUERY");
    console.log(query);

    let prom = new Promise((resolve, reject) => {
        con.query(query, (err, rows) => {
            if (err) {
                return reject(err);
            } else {


                let result = Object.values(JSON.parse(JSON.stringify(rows)));
                console.log("RESULTS");
                console.log(result);
                var objectReversed = result.reverse();

                var ids = objectReversed.map(item => item["resource_id"]);

                const setIDs = [...new Set(ids)];

                let object = new Map();

                setIDs.forEach(id => {
                    var objWithCurrentID = objectReversed.filter(obj => obj["resource_id"] === id);
                    object.set(id, objWithCurrentID);
                });

                var arr = {};

                object.forEach((value, key) => {
                    arr[key] = {};
                    value.forEach(property => {

                        var propertyObject = {};
                        var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                        propertyObject[propertyName] = property;

                        if (arr[key][propertyName] === undefined) {
                            arr[key][propertyName] = [property];
                        } else {
                            arr[key][propertyName].push(property);
                        }
                    });

                    object.set(key, arr[key]);
                });

                object.forEach((value, key) => {
                    for (let k in value) {
                        value[k].forEach(prop => {
                            if (prop.value_resource_id !== null) {
                                if (prop.value === undefined || prop.value === null) {
                                    prop.value = [];
                                    prop.value.push(object.get(prop.value_resource_id));
                                } else {
                                    prop.value.push(object.get(prop.value_resource_id));
                                }
                            }
                        });
                    }
                });

                var objectListFinal = null;

                if (id.length === 1) {
                    objectListFinal = object.get(id[0]);
                } else if (id.length > 1) {
                    objectListFinal = [];
                    id.forEach(id_number => {
                        objectListFinal.push(object.get(id_number));
                    });
                }

                resolve({objectListFinal, res});
            }
        });
    });

    return prom.then(function ({objectListFinal, res}) {
        //console.log("HO OTTWNUTO OBJETCT RESOLVE");
        //console.log(objectListFinal);

        if (objectListFinal === undefined) {
            objectListFinal = null;
        }

        con.end();

        if (res) {
            res.json(objectListFinal);
        } else {
            return objectListFinal;
        }


    });

    return prom.catch(function (err) {
        con.end();

        if (res) {
            //res.writeHead(200, {"Content-Type": "text"});
            res.json({message: 'Si è verificato un errore nella richiesta'});

        } else {
            return undefined;
        }

    });
};

function getSchedaLocusFromID(id, res) {
    console.log("ID DA TROVARE");
    console.log(id);

    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });


    var query = `WITH RECURSIVE test as ( 
        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
        FROM value as v1 
        WHERE v1.resource_id IN (${id.join(', ')})
    UNION
    (
      SELECT
        v2.resource_id,
        v2.property_id,
        v2.value_resource_id,
        v2.value,
        v2.uri
      FROM
        value as v2
        INNER JOIN test ON test.value_resource_id = v2.resource_id
    )
  )
  select
    test.resource_id,
    test.property_id,
    test.value_resource_id,
    test.value,
    property.local_name as property_name,
    property.label as property_label,
    vocabulary.prefix as vocabulary_prefix,
    r2.local_name,
    r2.label,
    m.storage_id as media_link,
    test.uri as uri_link
  from
    test
    join property on test.property_id = property.id
    join vocabulary on property.vocabulary_id = vocabulary.id
    join resource as r1 on test.resource_id = r1.id
    join resource_class as r2 on r1.resource_class_id = r2.id
    left join media as m on test.resource_id = m.item_id
    where property.local_name NOT IN("hasRelationshipsWithLociData");`;

    //TODO: mettere blocco try-catch
    console.log("QUERY");
    console.log(query);

    let prom = new Promise((resolve, reject) => {
        con.query(query, (err, rows) => {
            if (err) {
                return reject(err);
            } else {


                let result = Object.values(JSON.parse(JSON.stringify(rows)));
                console.log("RESULTS");
                console.log(result);
                var objectReversed = result.reverse();

                var ids = objectReversed.map(item => item["resource_id"]);

                const setIDs = [...new Set(ids)];

                let object = new Map();

                setIDs.forEach(id => {
                    var objWithCurrentID = objectReversed.filter(obj => obj["resource_id"] === id);
                    object.set(id, objWithCurrentID);
                });

                var arr = {};

                object.forEach((value, key) => {
                    arr[key] = {};
                    value.forEach(property => {

                        var propertyObject = {};
                        var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                        propertyObject[propertyName] = property;

                        if (arr[key][propertyName] === undefined) {
                            arr[key][propertyName] = [property];
                        } else {
                            arr[key][propertyName].push(property);
                        }
                    });

                    object.set(key, arr[key]);
                });

                object.forEach((value, key) => {
                    for (let k in value) {
                        value[k].forEach(prop => {
                            if (prop.value_resource_id !== null) {
                                if (prop.value === undefined || prop.value === null) {
                                    prop.value = [];
                                    prop.value.push(object.get(prop.value_resource_id));
                                } else {
                                    prop.value.push(object.get(prop.value_resource_id));
                                }
                            }
                        });
                    }
                });

                var objectListFinal = null;

                if (id.length === 1) {
                    objectListFinal = object.get(id[0]);
                } else if (id.length > 1) {
                    objectListFinal = [];
                    id.forEach(id_number => {
                        objectListFinal.push(object.get(id_number));
                    });
                }

                resolve({objectListFinal, res});
            }
        });
    });

    return prom.then(function ({objectListFinal, res}) {
        //console.log("HO OTTWNUTO OBJETCT RESOLVE");
        //console.log(objectListFinal);

        if (objectListFinal === undefined) {
            objectListFinal = null;
        }

        con.end();

        if (res) {
            res.json(objectListFinal);
        } else {
            return objectListFinal;
        }


    });

    return prom.catch(function (err) {
        con.end();

        if (res) {
            //res.writeHead(200, {"Content-Type": "text"});
            //res.end("Si è verificato un errore nella richiesta");
            res.json({message: 'Si è verificato un errore nella richiesta'});

        } else {
            return undefined;
        }

    });
};

function getLocusRelationshipsFromID(id, res) {
    console.log("RELAZIONI DEL LUOGO CON ID DA TROVARE");
    console.log(id);

    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });


    var query = `
WITH RECURSIVE test AS (
    SELECT
        v1.resource_id,
        v1.property_id,
        v1.value_resource_id,
        v1.value,
        v1.uri,
        1 AS depth
    FROM
        value AS v1
    WHERE
        v1.resource_id IN (${id})
    UNION
    SELECT
        v2.resource_id,
        v2.property_id,
        v2.value_resource_id,
        v2.value,
        v2.uri,
        t.depth + 1 AS depth
    FROM
        value AS v2
            INNER JOIN
        test t ON t.value_resource_id = v2.resource_id
    WHERE
        t.depth < 4  -- Set the desired depth limit
      AND NOT (t.depth >= 2 AND v2.property_id IN (
        SELECT id FROM property WHERE local_name IN ("locusLocatedIn", "locusIsPartOf")
    ))
)
SELECT
    test.resource_id,
    test.property_id,
    test.value_resource_id,
    test.value,
    property.local_name AS property_name,
    property.label AS property_label,
    vocabulary.prefix AS vocabulary_prefix,
    r2.local_name,
    r2.label,
    m.storage_id AS media_link,
    test.uri AS uri_link
FROM
    test
        JOIN
    property ON test.property_id = property.id
        JOIN
    vocabulary ON property.vocabulary_id = vocabulary.id
        JOIN
    resource AS r1 ON test.resource_id = r1.id
        JOIN
    resource_class AS r2 ON r1.resource_class_id = r2.id
        LEFT JOIN
    media AS m ON test.resource_id = m.item_id
WHERE
    (test.value_resource_id <> ${id} OR test.value_resource_id IS NULL) AND
    property.local_name IN ("hasRelationshipsWithLociData", "title", "description", "hasBasicCharacterizationData", "locusLocatedIn", "locusIsPartOf", "name");
`;


    //TODO: mettere blocco try-catch
    console.log("QUERY");
    console.log(query);

    let prom = new Promise((resolve, reject) => {
        con.query(query, (err, rows) => {
            if (err) {
                return reject(err);
            } else {


                let result = Object.values(JSON.parse(JSON.stringify(rows)));
                console.log("RESULTS");
                console.log(result);
                var objectReversed = result.reverse();

                var ids = objectReversed.map(item => item["resource_id"]);

                const setIDs = [...new Set(ids)];

                let object = new Map();

                setIDs.forEach(id => {
                    var objWithCurrentID = objectReversed.filter(obj => obj["resource_id"] === id);
                    object.set(id, objWithCurrentID);
                });

                var arr = {};

                object.forEach((value, key) => {
                    arr[key] = {};
                    value.forEach(property => {

                        var propertyObject = {};
                        var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                        propertyObject[propertyName] = property;

                        if (arr[key][propertyName] === undefined) {
                            arr[key][propertyName] = [property];
                        } else {
                            arr[key][propertyName].push(property);
                        }
                    });

                    object.set(key, arr[key]);
                });

                object.forEach((value, key) => {
                    for (let k in value) {
                        value[k].forEach(prop => {
                            if (prop.value_resource_id !== null) {
                                if (prop.value === undefined || prop.value === null) {
                                    prop.value = [];
                                    prop.value.push(object.get(prop.value_resource_id));
                                } else {
                                    prop.value.push(object.get(prop.value_resource_id));
                                }
                            }
                        });
                    }
                });

                var objectListFinal = null;

                if (id.length === 1) {
                    objectListFinal = object.get(id[0]);
                } else if (id.length > 1) {
                    objectListFinal = [];
                    id.forEach(id_number => {
                        objectListFinal.push(object.get(id_number));
                    });
                }

                resolve({objectListFinal, res});
            }
        });
    });

    return prom.then(function ({objectListFinal, res}) {
        //console.log("HO OTTWNUTO OBJETCT RESOLVE");
        //console.log(objectListFinal);

        if (objectListFinal === undefined) {
            objectListFinal = null;
        }

        con.end();

        if (res) {
            res.json(objectListFinal);
        } else {
            return objectListFinal;
        }


    });

    return prom.catch(function (err) {
        con.end();

        if (res) {
            //res.writeHead(200, {"Content-Type": "text"});
            res.json({message: 'Si è verificato un errore nella richiesta'});
        } else {
            return undefined;
        }

    });
};

function getAllFilmsIDsDB(res) {
    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    return getResourcesIdsFromClassName("FilmCatalogueRecord", con, res);
}

function getAllFilmsDB(res) {
    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    return getResourcesFromClassName("FilmCatalogueRecord", con, res);
}

function getAllLocusDB(res) {
    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    return getResourcesFromClassName("LocusCatalogueRecord", con, res);
}

function getAllFilmsHomepageDB(res) {
    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    return getFilmsHomepage("FilmCatalogueRecord", con, res);
}

async function getAllLocusHomepageDB(res, sendToClient = true) {
    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    return getLocusHomepage("LocusCatalogueRecord", con, res, sendToClient);
}

function getAllLocusWithMapInfoDB(res, sendToClient = true) {
    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    return getLocusWithMapInfo("LocusCatalogueRecord", con, res, sendToClient);
}

function getLocusNameFromID(locus_id, res) {
    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    //chiedo la lista di film
    var query = `SELECT v1.value FROM value v JOIN property p ON v.property_id = p.id JOIN value v1 on v.value_resource_id = v1.resource_id join property p1 on v1.property_id=p1.id
         join resource r ON v.resource_id = r.id JOIN resource_class rc ON r.resource_class_id = rc.id
         WHERE v.resource_id = ${locus_id} AND p1.local_name = "name" AND rc.local_name="LocusCatalogueRecord";`;

    let locusList = new Promise((resolve, reject) => {
        con.query(query, (err, rows) => {
            // console.log(rows);
            if (err) {
                return reject(err);
            } else {
                let list = Object.values(JSON.parse(JSON.stringify(rows)));

                resolve({list, res});
            }
        });
    });

    //chiedo tutti i dati dei film
    locusList.then(function ({list, res}) {
        console.log("RES NEL THEN");
        console.log(list);

        con.end();

        if(list.length > 0){
            res.json({name: list[0]["value"]});
        } else {
            res.json([]);
        }

    });


};


function getFilmsHomepage(className, con, res) {

    //chiedo la lista di film
    var query = `SELECT r.id as object_id, rc.id as class_id, rc.local_name as class_name, rc.label FROM resource r join resource_class rc on r.resource_class_id=rc.id WHERE rc.local_name="${className}"`;

    let filmsList = new Promise((resolve, reject) => {
        con.query(query, (err, rows) => {
            // console.log(rows);
            if (err) {
                return reject(err);
            } else {
                let list = Object.values(JSON.parse(JSON.stringify(rows)));

                resolve({list, res});
            }
        });
    });

    //chiedo tutti i dati dei film
    filmsList.then(function ({list, res}) {
        console.log("RES NEL THEN");

        list = list.map(film => film.object_id);
        console.log(list);

        // list = list.slice(0, 2);

        if (list.length > 0) {

            var query = `
    WITH RECURSIVE test as ( 
        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
        FROM value as v1 
        WHERE v1.resource_id=${list.join(" OR v1.resource_id=")
            }
    UNION
    (
      SELECT
        v2.resource_id,
        v2.property_id,
        v2.value_resource_id,
        v2.value,
        v2.uri
      FROM
        value as v2
        INNER JOIN test ON test.value_resource_id = v2.resource_id
    )
  )
  select
    test.resource_id,
    test.property_id,
    test.value_resource_id,
    test.value,
    property.local_name as property_name,
    property.label as property_label,
    vocabulary.prefix as vocabulary_prefix,
    r2.local_name,
    r2.label,
    m.storage_id as media_link,
    test.uri as uri_link
  from
    test
    join property on test.property_id = property.id
    join vocabulary on property.vocabulary_id = vocabulary.id
    join resource as r1 on test.resource_id = r1.id
    join resource_class as r2 on r1.resource_class_id = r2.id
    left join media as m on test.resource_id = m.item_id
  where property.local_name IN ("title", "hasImageData", "caption", "genre", "hasTypologyData", "hasDirectorData", "directorName");`;

            console.log("QUERY");
            console.log(query);

            makeInnerQuery(con, res, query, list);
        } else {
            con.end();
            res.json([]);
        }

    });


};

async function getFilmsOfLocus(list, con, res, filters) {
    console.log("CHIEDO I FILM PER MOSSTRARLI E SONO DENTRO getFilmsOfLocus");
    console.log(list);

    // list = list.slice(0, 2);

    if (list.length > 0) {

        var query = `
    WITH RECURSIVE test as ( 
        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
        FROM value as v1 
        WHERE v1.resource_id=${list.join(" OR v1.resource_id=")
            }
    UNION
    (
      SELECT
        v2.resource_id,
        v2.property_id,
        v2.value_resource_id,
        v2.value,
        v2.uri
      FROM
        value as v2
        INNER JOIN test ON test.value_resource_id = v2.resource_id
    )
  )
  select
    test.resource_id,
    test.property_id,
    test.value_resource_id,
    test.value,
    property.local_name as property_name,
    property.label as property_label,
    vocabulary.prefix as vocabulary_prefix,
    r2.local_name,
    r2.label,
    m.storage_id as media_link,
    test.uri as uri_link
  from
    test
    join property on test.property_id = property.id
    join vocabulary on property.vocabulary_id = vocabulary.id
    join resource as r1 on test.resource_id = r1.id
    join resource_class as r2 on r1.resource_class_id = r2.id
    left join media as m on test.resource_id = m.item_id
  where property.local_name IN ("title", "hasImageData", "caption", "genre", "hasTypologyData", "hasDirectorData", "directorName");`;

        console.log("QUERY");
        console.log(query);

        makeInnerQuery(con, res, query, list, true);
    } else {
        con.end();
        res.json([]);
    }

};

async function getLocusHomepage(className, con, res, sendToClient = true) {
    console.log("HO CHIAMATO GET LOCUS HOMEPAGE: sendToClient -> " + sendToClient);
    //chiedo la lista di film
    var query = `SELECT r.id as object_id, rc.id as class_id, rc.local_name as class_name, rc.label FROM resource r join resource_class rc on r.resource_class_id=rc.id WHERE rc.local_name="${className}"`;

    let filmsList = new Promise((resolve, reject) => {
        con.query(query, (err, rows) => {
            // console.log(rows);
            if (err) {
                return reject(err);
            } else {
                let list = Object.values(JSON.parse(JSON.stringify(rows)));

                resolve({list, res});
            }
        });
    });

    //chiedo tutti i dati dei film
    return filmsList.then(function ({list, res}) {
        console.log("LOCUS HOMEPAGE - RES NEL THEN");

        list = list.map(film => film.object_id);
        console.log(list);

        // list = list.slice(0, 2);

        if (list.length > 0) {

            var query = `
    WITH RECURSIVE test as ( 
        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
        FROM value as v1 
        WHERE v1.resource_id=${list.join(" OR v1.resource_id=")
            }
    UNION
    (
      SELECT
        v2.resource_id,
        v2.property_id,
        v2.value_resource_id,
        v2.value,
        v2.uri
      FROM
        value as v2
        INNER JOIN test ON test.value_resource_id = v2.resource_id
    )
  )
  select
    test.resource_id,
    test.property_id,
    test.value_resource_id,
    test.value,
    property.local_name as property_name,
    property.label as property_label,
    vocabulary.prefix as vocabulary_prefix,
    r2.local_name,
    r2.label,
    m.storage_id as media_link,
    test.uri as uri_link
  from
    test
    join property on test.property_id = property.id
    join vocabulary on property.vocabulary_id = vocabulary.id
    join resource as r1 on test.resource_id = r1.id
    join resource_class as r2 on r1.resource_class_id = r2.id
    left join media as m on test.resource_id = m.item_id
  where property.local_name IN ("title", "hasBasicCharacterizationData", "realityStatus",  "name", "description", "hasImageData", "hasTypeData", "hasIRITypeData", "type", "hasIRIType", "typeName");`;

            console.log("QUERY");
            console.log(query);

            return makeInnerQuery(con, res, query, list, sendToClient);
        } else {
            con.end();
            res.json([]);
        }

    });


};

function getLocusWithMapInfo(className, con, res, sendToClient = true) {
    console.log("HO CHIAMATO GET LOCUS HOMEPAGE: sendToClient -> " + sendToClient);
    //chiedo la lista di film
    var query = `SELECT r.id as object_id, rc.id as class_id, rc.local_name as class_name, rc.label FROM resource r join resource_class rc on r.resource_class_id=rc.id WHERE rc.local_name="${className}"`;

    let filmsList = new Promise((resolve, reject) => {
        con.query(query, (err, rows) => {
            // console.log(rows);
            if (err) {
                return reject(err);
            } else {
                let list = Object.values(JSON.parse(JSON.stringify(rows)));

                resolve({list, res});
            }
        });
    });

    //chiedo tutti i dati dei film
    return filmsList.then(function ({list, res}) {
        console.log("LOCUS HOMEPAGE - RES NEL THEN");

        list = list.map(film => film.object_id);
        //console.log(list);

        // list = list.slice(0, 2);

        if (list.length > 0) {

            var query = `
    WITH RECURSIVE test as ( 
        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
        FROM value as v1 
        WHERE v1.resource_id=${list.join(" OR v1.resource_id=")
            }
    UNION
    (
      SELECT
        v2.resource_id,
        v2.property_id,
        v2.value_resource_id,
        v2.value,
        v2.uri
      FROM
        value as v2
        INNER JOIN test ON test.value_resource_id = v2.resource_id
    )
  )
  select
    test.resource_id,
    test.property_id,
    test.value_resource_id,
    test.value,
    property.local_name as property_name,
    property.label as property_label,
    vocabulary.prefix as vocabulary_prefix,
    r2.local_name,
    r2.label,
    m.storage_id as media_link,
    test.uri as uri_link
  from
    test
    join property on test.property_id = property.id
    join vocabulary on property.vocabulary_id = vocabulary.id
    join resource as r1 on test.resource_id = r1.id
    join resource_class as r2 on r1.resource_class_id = r2.id
    left join media as m on test.resource_id = m.item_id
  where property.local_name IN ("title", "hasBasicCharacterizationData", "realityStatus",  "name", "description", "hasImageData", "hasTypeData", "hasIRITypeData", "type", "hasIRIType", "typeName", "hasMapReferenceData", "mapReferenceIRI", "mapReferenceTextualData");`;

            console.log("QUERY");
            console.log(query);

            return makeInnerQuery(con, res, query, list, sendToClient);
        } else {
            con.end();
            res.json([]);
        }

    });


};

function getResourcesFromClassName(className, con, res) {

    //chiedo la lista di film
    var query = `SELECT r.id as object_id, rc.id as class_id, rc.local_name as class_name, rc.label FROM resource r join resource_class rc on r.resource_class_id=rc.id WHERE rc.local_name="${className}"`;

    let filmsList = new Promise((resolve, reject) => {
        con.query(query, (err, rows) => {
            // console.log(rows);
            if (err) {
                return reject(err);
            } else {
                let list = Object.values(JSON.parse(JSON.stringify(rows)));

                resolve({list, res});
            }
        });
    });

    //chiedo tutti i dati dei film
    filmsList.then(function ({list, res}) {
        console.log("RES NEL THEN");

        list = list.map(film => film.object_id);
        console.log(list);

        // list = list.slice(0, 2);

        if (list.length > 0) {

            var query = `
    WITH RECURSIVE test as ( 
        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
        FROM value as v1 
        WHERE v1.resource_id=${list.join(" OR v1.resource_id=")
        }
    UNION
    (
      SELECT
        v2.resource_id,
        v2.property_id,
        v2.value_resource_id,
        v2.value,
        v2.uri
      FROM
        value as v2
        INNER JOIN test ON test.value_resource_id = v2.resource_id
    )
  )
  select
    test.resource_id,
    test.property_id,
    test.value_resource_id,
    test.value,
    property.local_name as property_name,
    property.label as property_label,
    vocabulary.prefix as vocabulary_prefix,
    r2.local_name,
    r2.label,
    m.storage_id as media_link,
    test.uri as uri_link
  from
    test
    join property on test.property_id = property.id
    join vocabulary on property.vocabulary_id = vocabulary.id
    join resource as r1 on test.resource_id = r1.id
    join resource_class as r2 on r1.resource_class_id = r2.id
    left join media as m on test.resource_id = m.item_id;
          `;

            console.log("QUERY");
            console.log(query);

            makeInnerQuery(con, res, query, list);
        } else {
            con.end();
            res.json([]);
        }

    });


};

function getResourcesIdsFromClassName(className, con, res) {

    //chiedo la lista di film
    var query = `SELECT r.id as object_id, rc.id as class_id, rc.local_name as class_name, rc.label FROM resource r join resource_class rc on r.resource_class_id=rc.id WHERE rc.local_name="${className}"`;

    let filmsList = new Promise((resolve, reject) => {
        con.query(query, (err, rows) => {
            // console.log(rows);
            if (err) {
                return reject(err);
            } else {
                let list = Object.values(JSON.parse(JSON.stringify(rows)));

                resolve({list, res});
            }
        });
    });

    //chiedo tutti i dati dei film
    return filmsList.then(function ({list, res}) {
        console.log("RES NEL THEN");

        list = list.map(film => film.object_id);
        console.log(list);

        // list = list.slice(0, 2);
        con.end();

        return list;
    });


};


function getSchedeAVofFilm(res, req) {
    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    console.log("REQ FILM ID");
    console.log(req.body.film_id);

    if (req.body.film_id) {
        //chiedo la lista di film
        var query = `SELECT resource_id FROM value WHERE value_resource_id=${req.body.film_id}`;

        let idsSchedeAVofFilm = new Promise((resolve, reject) => {
            con.query(query, (err, rows) => {
                // console.log(rows);
                if (err) {
                    return reject(err);
                } else {
                    let list = Object.values(JSON.parse(JSON.stringify(rows)));

                    resolve({list, res});
                }
            });
        });

        //chiedo tutti i dati dei film
        idsSchedeAVofFilm.then(function ({list, res}) {
            console.log("RES NEL THEN");

            list = list.map(film => film.resource_id);
            console.log(list);

            // list = list.slice(0, 2);

            if (list.length > 0) {

                var query = `
    WITH RECURSIVE test as ( 
        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
        FROM value as v1 
        WHERE v1.resource_id=${list.join(" OR v1.resource_id=")
                }
    UNION
    (
      SELECT
        v2.resource_id,
        v2.property_id,
        v2.value_resource_id,
        v2.value,
        v2.uri
      FROM
        value as v2
        INNER JOIN test ON test.value_resource_id = v2.resource_id
    )
  )
  select
    test.resource_id,
    test.property_id,
    test.value_resource_id,
    test.value,
    property.local_name as property_name,
    property.label as property_label,
    vocabulary.prefix as vocabulary_prefix,
    r2.local_name,
    r2.label,
    m.storage_id as media_link,
    test.uri as uri_link
  from
    test
    join property on test.property_id = property.id
    join vocabulary on property.vocabulary_id = vocabulary.id
    join resource as r1 on test.resource_id = r1.id
    join resource_class as r2 on r1.resource_class_id = r2.id
    left join media as m on test.resource_id = m.item_id;
          `;

                //console.log("QUERY");
                //console.log(query);

                makeInnerQuery(con, res, query, list);

                /*
                let prom = new Promise((resolve, reject) => {
                    con.query(
                        query,
                        (err, rows) => {
                            // console.log(rows);
                            if (err) {
                                return reject(err);
                            } else {
                                let result = Object.values(JSON.parse(JSON.stringify(rows)));

                                object = result.reverse();
                                var object = object.reduce(function (r, a) {
                                    r[a.resource_id] = r[a.resource_id] || [];
                                    r[a.resource_id].push(a);
                                    return r;
                                }, Object.create(null));

                                var arr = {};

                                for (let key in object) {
                                    arr[key] = {};
                                    object[key].forEach(property => {

                                        var propertyObject = {};
                                        var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                                        propertyObject[propertyName] = property;

                                        if (arr[key][propertyName] === undefined) {
                                            arr[key][propertyName] = [property];
                                        } else {
                                            arr[key][propertyName].push(property);
                                        }
                                        // arr[key][propertyName] = property;
                                    });
                                }

                                for (let key in arr) {
                                    //console.log("KEY: " + key);
                                    //console.log(arr[key]);

                                    for (let internalKey in arr[key]) {
                                        var property = arr[key][internalKey];
                                        //console.log("SONO QUA");
                                        //console.log(property);

                                        property.forEach(prop => {
                                            if (prop.value_resource_id !== null) {
                                                //la property collega una risorsa

                                                //console.log("\n\n\n\nORA PROP VALUE E'");
                                                //console.log(prop.value);

                                                if (prop.value === undefined || prop.value === null) {
                                                    prop.value = [];
                                                    //console.log("\nDEVO METTERE UN OGGETTO");

                                                    //console.log("\n\n STAMPO")
                                                    //console.log(arr[prop.value_resource_id]);
                                                    prop.value.push(JSON.parse(JSON.stringify(arr[prop.value_resource_id])));
                                                } else {
                                                    //console.log("\nDEVO METTERE UN OGGETTO");
                                                    //console.log("\n\n STAMPO")
                                                    //console.log(arr[prop.value_resource_id]);
                                                    prop.value.push(JSON.parse(JSON.stringify(arr[prop.value_resource_id])));
                                                }
                                            }
                                        });

                                    }
                                }
                                ;

                                finalObject = arr;

                                var objectList = [];

                                for (let key in object) {
                                    //console.log("KEY: " + key);
                                    //console.log(list);
                                    if (list.includes(parseInt(key))) {
                                        objectList.push(object[key]);
                                        // console.log(object[key]);
                                        // var finalObject = {}

                                        // object[key].forEach(property => {
                                        //   var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];
                                        //   finalObject[propertyName] = property;
                                        // });

                                        // console.log("FINAL OBJECT");
                                        // console.log(finalObject);

                                        // objectList.push(finalObject);
                                    }
                                }

                                var objectListFinal = [];

                                objectList.forEach(object => {
                                    var finalObject = {};

                                    object.forEach(property => {
                                        var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                                        if (!finalObject[propertyName]) {
                                            finalObject[propertyName] = [property];
                                        } else {
                                            finalObject[propertyName].push(property);
                                        }

                                    });

                                    objectListFinal.push(finalObject);
                                });

                                resolve({objectListFinal, res});
                            }
                        });
                });

                prom.then(
                    function ({objectListFinal, res}) {
                        // console.log("RES NEL THEN");
                        // console.log(res);
                        console.log("HO OTTWNUTO OBJETCT RESOLVE");
                        res.writeHead(200, {"Content-Type": "application/json"});
                        res.end(
                            JSON.stringify(objectListFinal)
                        );
                    });

                prom.catch(function (err) {
                    res.writeHead(200, {"Content-Type": "text"});
                    res.end(
                        "Si è verificato un errore nella richiesta"
                    );
                });

*/
            } else {
                //res.writeHead(200, {"Content-Type": "application/json"});
                res.json([]);

                con.end();
            }


        });
    } else {
        //res.writeHead(200, {"Content-Type": "text"});
        //res.end("An error has occurred");
        res.json({message: 'Si è verificato un errore nella richiesta'});

        con.end();
    }
}


function getUnitaCatalograficheOfFilm(res, req) {
    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    console.log("REQ FILM ID");
    console.log(req.body.film_id);

    if (req.body.film_id) {
        const queries = [`START TRANSACTION`,

            `SELECT distinct uc.resource_id FROM value as f join value as fc on f.resource_id = fc.value_resource_id join value as uc on fc.resource_id = uc.value_resource_id where f.resource_id=${req.body.film_id}`,

            `SELECT distinct uc.resource_id FROM value as f join value as fc on f.resource_id = fc.value_resource_id join value as uc on fc.resource_id = uc.value_resource_id where f.resource_id=${req.body.film_id}
            UNION
            SELECT v.resource_id FROM value v JOIN property p on v.property_id = p.id WHERE value_resource_id IN (
                SELECT distinct uc.resource_id FROM value as f join value as fc on f.resource_id = fc.value_resource_id join value as uc on fc.resource_id = uc.value_resource_id where f.resource_id=${req.body.film_id})
            AND p.local_name = "hasLinkedFilmUnitCatalogueRecord"`];

        var q = `
                    WITH RECURSIVE test as ( 
                        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
                        FROM value as v1 
                        WHERE v1.resource_id IN (
                            SELECT distinct uc.resource_id FROM value as f join value as fc on f.resource_id = fc.value_resource_id join value as uc on fc.resource_id = uc.value_resource_id where f.resource_id=${req.body.film_id}
                            UNION
                            SELECT v.resource_id FROM value v JOIN property p on v.property_id = p.id WHERE value_resource_id IN (
                                SELECT distinct uc.resource_id FROM value as f join value as fc on f.resource_id = fc.value_resource_id join value as uc on fc.resource_id = uc.value_resource_id where f.resource_id=${req.body.film_id})
                            AND p.local_name = "hasLinkedFilmUnitCatalogueRecord"
                        )
                    UNION
                    (
                      SELECT
                        v2.resource_id,
                        v2.property_id,
                        v2.value_resource_id,
                        v2.value,
                        v2.uri
                      FROM
                        value as v2
                        INNER JOIN test ON test.value_resource_id = v2.resource_id
                    )
                  )
                  select
                    test.resource_id,
                    test.property_id,
                    test.value_resource_id,
                    test.value,
                    property.local_name as property_name,
                    property.label as property_label,
                    vocabulary.prefix as vocabulary_prefix,
                    r2.local_name,
                    r2.label,
                    m.storage_id as media_link,
                    test.uri as uri_link
                  from
                    test
                    join property on test.property_id = property.id
                    join vocabulary on property.vocabulary_id = vocabulary.id
                    join resource as r1 on test.resource_id = r1.id
                    join resource_class as r2 on r1.resource_class_id = r2.id
                    left join media as m on test.resource_id = m.item_id
                    where property.local_name NOT IN("hasMapReferenceData", "mapReferenceIRI", "mapReferenceTextualData", "hasRelationshipsWithLociData", "locusLocatedIn", "locusIsPartOf", "hasLinkedFilmCopyCatalogueRecord")
                  ;`;

        //where property.local_name NOT IN ("hasLinkedFilmUnitCatalogueRecord")

        queries.push(q);

        queries.push("COMMIT;");

        var con = mysql.createConnection({
            host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
        });


        var results = []; // Array per salvare i risultati della terza query
        var listIDsUC = [];
        var list = [];

        function executeBatchQueries(queries, index = 0) {
            if (index < queries.length) {
                const query = queries[index];
                con.query(query, (error, queryResults) => {
                    if (error) {
                        con.rollback(() => {
                            console.error('Errore nell\'esecuzione della query:', error);
                            con.end();
                        });
                    } else {
                        console.log("INDEX: " + index);

                        //console.log('Query eseguita con successo:', query);
                        if (index === 3) { // Verifica se questa è la terza query (l'indice 2)
                            //console.log('Risultati della terza query:', queryResults);
                            results = queryResults;
                            //console.log("results");
                            //console.log(results);
                        } else if (index === 2) {
                            list = queryResults.map(res => res.resource_id);

                            console.log("list");
                            console.log(list);
                        } else if (index === 1) {
                            //console.log("\n\nLISTA IDS LUOGHI CON TIPO DATO");
                            listIDsUC = queryResults.map(res => res.resource_id);

                            console.log("listIDsUC");
                            console.log(listIDsUC);
                            //console.log("LIST");
                            //console.log(list);
                        }
                    }
                    executeBatchQueries(queries, index + 1);
                });
            } else {
                // Chiudi la connessione quando tutte le query sono state eseguite
                con.end();
                // Restituisci i risultati della terza query al frontend
                //console.log('Risultati finali da restituire al frontend:', results);

                let result = Object.values(JSON.parse(JSON.stringify(results)));

                console.log("\n\n\nRESULT QUA!!!");
                console.log(result);

                var objectReversed = result.reverse();

                var ids = objectReversed.map(item => item["resource_id"]);

                const setIDs = [...new Set(ids)];

                let object = new Map();

                setIDs.forEach(id => {
                    var objWithCurrentID = objectReversed.filter(obj => obj["resource_id"] === id);
                    object.set(id, objWithCurrentID);
                });

                var arr = {};

                object.forEach((value, key) => {
                    arr[key] = {};
                    value.forEach(property => {

                        var propertyObject = {};
                        var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                        propertyObject[propertyName] = property;

                        if (arr[key][propertyName] === undefined) {
                            arr[key][propertyName] = [property];
                        } else {
                            arr[key][propertyName].push(property);
                        }
                    });

                    object.set(key, arr[key]);
                });

                object.forEach((value, key) => {
                    for (let k in value) {
                        value[k].forEach(prop => {
                            if (prop.value_resource_id !== null) {
                                if (prop.value === undefined || prop.value === null) {
                                    prop.value = [];
                                    prop.value.push(object.get(prop.value_resource_id));
                                } else {
                                    prop.value.push(object.get(prop.value_resource_id));
                                }
                            }
                        });
                    }
                });

                var objectListFinal = [];

                console.log("\n\nLIST QUA: ");
                console.log(list);

                list.forEach(id => {
                    objectListFinal.push(object.get(id));
                })

                //Ordino in ordine alfabetico
                objectListFinal.sort((a, b) => {
                    const titleA = a['dcterms:title'][0]['value'].split(':')[1].trim();
                    const titleB = b['dcterms:title'][0]['value'].split(':')[1].trim();

                    // Usa localeCompare per ordinare in base al titolo (ignorando maiuscole/minuscole)
                    return titleA.localeCompare(titleB);
                });

                console.log("\n\n\nobjectListFinal");
                console.log(objectListFinal);

                console.log("\n\n\nlistIDsUC");
                console.log(listIDsUC);

                var listUCs = objectListFinal.filter(obj => {
                    return listIDsUC.includes(obj["dcterms:title"][0]["resource_id"])
                });

                var listRappresentazioniLuogo = objectListFinal.filter(obj => {
                    return !listIDsUC.includes(obj["dcterms:title"][0]["resource_id"])
                });

                console.log("\n\nLIST UCs");
                console.log(listUCs);


                console.log("\n\nlistRappresentazioniLuogo");
                console.log(listRappresentazioniLuogo);


                listRappresentazioniLuogo.forEach(rappr => {
                    console.log("\nSTAMPO rappr");
                    console.log(rappr);

                    var ucID = rappr["precro:hasLinkedFilmUnitCatalogueRecord"][0]["value"][0]["dcterms:title"][0]["resource_id"];
                    console.log("ucID: " + ucID);

                    var ucObjectIndex = listUCs.findIndex(uc => uc["dcterms:title"][0]["resource_id"] === ucID);
                    console.log("ucObjectIndex: ", ucObjectIndex);
                    console.log(ucObjectIndex === -1);

                    if (ucObjectIndex !== -1) {
                        rappr["precro:hasLinkedFilmUnitCatalogueRecord"] = null;
                        listUCs[ucObjectIndex].rappresentazioneLuogo = rappr;
                        console.log("HO AGGIUNTO LA RAPPRESENTAZIONE LUOGO ALL'UC");
                    }
                });

                console.log("\n\nRAPPR LUOGO");

                if (req.body.locus_id) {
                    var locusID = req.body.locus_id;
                    var ucCameraPlacement = [];
                    var ucNarrativePlace = [];
                    var otherUC = [];

                    //Ciclo tutte le UC e controllo quali sono girate a, ambientate a o fanno parte di una terza lista
                    listUCs.forEach(uc => {
                        var alreadyAddedInCameraPlacement = false;
                        var alreadyAddedInNarrativePlace = false;
                        var connectedRapprLuogo = uc.rappresentazioneLuogo;

                        //TODO: SISTEMARE, DEVO CONSIDERARE IL FATTO DI AVERE PIU' LUOGHI IN UN ATTRIBUTO!!!!!
                        //TODO: usare questo caso per vedere: http://localhost:3000/pages/film-summary-sheet/551/4972
                        if (connectedRapprLuogo && connectedRapprLuogo["precro:hasPlacesData"] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:placeRepresentationHasCameraPlacement']) {
                            console.log("\n1 - sono in camera placement");
                            console.log(connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:placeRepresentationHasCameraPlacement'][0]);
                            console.log(connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:placeRepresentationHasCameraPlacement'][0]['value_resource_id']);

                            console.log("CICLO I LUOGHI NARRATIVIDI CONTESTO");
                            connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:placeRepresentationHasCameraPlacement'].forEach(cameraPlacement => {
                                //console.log("\nnarrativePlace");
                                //console.log(narrativePlace);

                                if (locusID === cameraPlacement['value_resource_id']) {
                                    ucCameraPlacement.push(uc);
                                    alreadyAddedInCameraPlacement = true;
                                    console.log("ho aggiunto a camera placement");
                                }
                            });
                        }
                        //TODO: SISTEMARE, DEVO CONSIDERARE IL FATTO DI AVERE PIU' LUOGHI IN UN ATTRIBUTO!!!!!

                        if (connectedRapprLuogo && connectedRapprLuogo["precro:hasPlacesData"] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasDisplayedObject']) {
                            console.log("\n2 - sono in camera placement");
                            console.log(connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasDisplayedObject'][0]);
                            console.log(connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasDisplayedObject'][0]['value_resource_id']);

                            console.log("CICLO I LUOGHI NARRATIVIDI CONTESTO");
                            connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasDisplayedObject'].forEach(displayedObject => {
                                //console.log("\nnarrativePlace");
                                //console.log(narrativePlace);

                                if (!alreadyAddedInCameraPlacement && locusID === displayedObject['value_resource_id']) {
                                    ucCameraPlacement.push(uc);
                                    alreadyAddedInCameraPlacement = true;
                                    console.log("ho aggiunto a camera placement");
                                }
                            });


                        }
                        //TODO: SISTEMARE, DEVO CONSIDERARE IL FATTO DI AVERE PIU' LUOGHI IN UN ATTRIBUTO!!!!!

                        if (connectedRapprLuogo && connectedRapprLuogo["precro:hasPlacesData"] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasRepresentedNarrativePlace']) {
                            console.log("\n3 - sono in camera placement");
                            console.log(connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasRepresentedNarrativePlace'][0]);
                            console.log(connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasRepresentedNarrativePlace'][0]['value_resource_id']);

                            console.log("CICLO I LUOGHI NARRATIVIDI CONTESTO");
                            connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasRepresentedNarrativePlace'].forEach(representedNarrativaPlace => {
                                //console.log("\nnarrativePlace");
                                //console.log(narrativePlace);

                                if (!alreadyAddedInCameraPlacement && locusID === representedNarrativaPlace['value_resource_id']) {
                                    ucCameraPlacement.push(uc);
                                    alreadyAddedInCameraPlacement = true;
                                    console.log("ho aggiunto a camera placement");
                                }
                            });


                        }

                        //TODO: dovrei averlo sistemato
                        //TODO: SISTEMARE, DEVO CONSIDERARE IL FATTO DI AVERE PIU' LUOGHI IN UN ATTRIBUTO!!!!!

                        //Luogo narrativo
                        if (connectedRapprLuogo && connectedRapprLuogo["precro:hasContextualElementsData"] && connectedRapprLuogo["precro:hasContextualElementsData"][0]['value'] && connectedRapprLuogo["precro:hasContextualElementsData"][0]['value'][0]['precro:placeRepresentationHasContextualNarrativePlace']) {
                            console.log("\n4 - sono narrative place");
                            console.log(connectedRapprLuogo["precro:hasContextualElementsData"][0]['value'][0]['precro:placeRepresentationHasContextualNarrativePlace'][0]);
                            console.log(connectedRapprLuogo["precro:hasContextualElementsData"][0]['value'][0]['precro:placeRepresentationHasContextualNarrativePlace'][0]['value_resource_id']);

                            console.log("CICLO I LUOGHI NARRATIVIDI CONTESTO");
                            connectedRapprLuogo["precro:hasContextualElementsData"][0]['value'][0]['precro:placeRepresentationHasContextualNarrativePlace'].forEach(narrativePlace => {
                                //console.log("\nnarrativePlace");
                                //console.log(narrativePlace);

                                if (!alreadyAddedInCameraPlacement && locusID === narrativePlace['value_resource_id']) {
                                    ucNarrativePlace.push(uc);
                                    alreadyAddedInNarrativePlace = true;
                                    console.log("ho aggiunto a narrative place");
                                }
                            });


                        }

                        if (!alreadyAddedInCameraPlacement && !alreadyAddedInNarrativePlace) {
                            console.log("\naggiungo l'uc alla lista delle restanti");
                            otherUC.push(uc);
                        }
                    });

                    var ucObject = {
                        ucCameraPlacement: ucCameraPlacement,
                        ucNarrativePlace: ucNarrativePlace,
                        otherUC: otherUC
                    }

                    console.log("INVIO LE UC SEPARATE");
                    console.log(ucObject);
                    res.json(ucObject);

                } else {
                    res.json(listUCs);
                }

                //res.json(listRappresentazioniLuogo);
                //res.writeHead(200, {"Content-Type": "application/json"});


            }
        }

        executeBatchQueries(queries);

        //chiedo la lista di film
        /*
        var query = `SELECT distinct uc.resource_id FROM value as f join value as fc on f.resource_id = fc.value_resource_id join value as uc on fc.resource_id = uc.value_resource_id where f.resource_id =${req.body.film_id}`;

        let idsSchedeAVofFilm = new Promise((resolve, reject) => {
            con.query(query, (err, rows) => {
                // console.log(rows);
                if (err) {
                    return reject(err);
                } else {
                    let list = Object.values(JSON.parse(JSON.stringify(rows)));

                    resolve({list, res});
                }
            });
        });

        //chiedo tutti i dati dei film
        idsSchedeAVofFilm.then(async function ({list, res}) {
            console.log("RES NEL THEN");

            list = list.map(film => film.resource_id);
            console.log(list);

            // list = list.slice(0, 2);

            if (list.length > 0) {

                var query = `
    WITH RECURSIVE test as (
        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
        FROM value as v1
        WHERE v1.resource_id=${list.join(" OR v1.resource_id=")
                    }
    UNION
    (
      SELECT
        v2.resource_id,
        v2.property_id,
        v2.value_resource_id,
        v2.value,
        v2.uri
      FROM
        value as v2
        INNER JOIN test ON test.value_resource_id = v2.resource_id
    )
  )
  select
    test.resource_id,
    test.property_id,
    test.value_resource_id,
    test.value,
    property.local_name as property_name,
    property.label as property_label,
    vocabulary.prefix as vocabulary_prefix,
    r2.local_name,
    r2.label,
    m.storage_id as media_link,
    test.uri as uri_link
  from
    test
    join property on test.property_id = property.id
    join vocabulary on property.vocabulary_id = vocabulary.id
    join resource as r1 on test.resource_id = r1.id
    join resource_class as r2 on r1.resource_class_id = r2.id
    left join media as m on test.resource_id = m.item_id;
          `;

                //console.log("QUERY");
                //console.log(query);

                var listUCs = await makeInnerQuery(con, res, query, list, false);

                console.log("LISTA DELLE UC");
                console.log(listUCs);



            } else {
                //res.writeHead(200, {"Content-Type": "application/json"});
                res.json([]);

                con.end();
            }

        });

         */
    } else {
        //res.writeHead(200, {"Content-Type": "text"});
        //res.end("An error has occurred");
        res.json({message: 'Si è verificato un errore nella richiesta'});

        con.end();
    }
}


function getSchedeRappresentazioneLuoghiOfUnitaCatalografica(res, req) {
    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    console.log("REQ UC ID");
    console.log(req.body.uc_id);

    if (req.body.uc_id) {
        //chiedo la lista di film
        var query = `SELECT distinct resource_id FROM value where value_resource_id =${req.body.uc_id}`;

        let idsSchedeAVofFilm = new Promise((resolve, reject) => {
            con.query(query, (err, rows) => {
                // console.log(rows);
                if (err) {
                    return reject(err);
                } else {
                    let list = Object.values(JSON.parse(JSON.stringify(rows)));

                    resolve({list, res});
                }
            });
        });

        //chiedo tutti i dati dei film
        idsSchedeAVofFilm.then(function ({list, res}) {
            console.log("RES NEL THEN");

            list = list.map(film => film.resource_id);
            console.log("LISTA IDDDDDD");
            console.log(list);

            // list = list.slice(0, 2);

            if (list.length > 0) {

                var query = `
    WITH RECURSIVE test as ( 
        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
        FROM value as v1 
        WHERE v1.resource_id=${list.join(" OR v1.resource_id=")
                    }
    UNION
    (
      SELECT
        v2.resource_id,
        v2.property_id,
        v2.value_resource_id,
        v2.value,
        v2.uri
      FROM
        value as v2
        INNER JOIN test ON test.value_resource_id = v2.resource_id
    )
  )
  select
    test.resource_id,
    test.property_id,
    test.value_resource_id,
    test.value,
    property.local_name as property_name,
    property.label as property_label,
    vocabulary.prefix as vocabulary_prefix,
    r2.local_name,
    r2.label,
    m.storage_id as media_link,
    test.uri as uri_link
  from
    test
    join property on test.property_id = property.id
    join vocabulary on property.vocabulary_id = vocabulary.id
    join resource as r1 on test.resource_id = r1.id
    join resource_class as r2 on r1.resource_class_id = r2.id
    left join media as m on test.resource_id = m.item_id
    where property.local_name IN ("title", "description") and r2.local_name = "PlaceRepresentationCatalogueRecord";
          `;

                makeInnerQuery(con, res, query, list);

            } else {
                //res.writeHead(200, {"Content-Type": "application/json"});
                res.json([]);

                con.end();
            }

        });
    } else {
        //res.writeHead(200, {"Content-Type": "text"});
        //res.end("An error has occurred");
        res.json({message: 'Si è verificato un errore nella richiesta'});

        con.end();
    }
}

function removeDuplicatesByProps(array) {
    var props = ['property_id', 'value', 'local_name'];
    return array.reduce((accumulator, current) => {
        const isDuplicate = accumulator.some(item =>
            props.every(prop => item[prop] === current[prop])
        );

        if (!isDuplicate) {
            accumulator.push(current);
        }

        return accumulator;
    }, []);
}

function getFilmFilters(res, req) {
    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    //chiedo la lista di film
    var query = `SELECT distinct resource_id, property_id, value, p.local_name FROM value v join property p on v.property_id = p.id where property_id in (
    SELECT distinct p.id FROM property p join vocabulary v on p.vocabulary_id = v.id where p.local_name in ("genre", "titleType", "titleLanguage", "productionCompanyCountry", "productionCompanyName", "dateTypology", "lighting", "cameraAngle", "tilt", "cameraShotType", "hasMatte", "cameraPlacement", "cameraMotion", "colouring", "hasIRIType", "directorName", "castMemberName", "otherCastMemberName", "characterName", "presentPersonCastMemberName", "presentPersonCharacterName") and (v.prefix = "ficro" or v.prefix = "fiucro" or v.prefix = "filocro" or v.prefix = "precro"));`;

    let filters = new Promise((resolve, reject) => {
        con.query(query, (err, rows) => {
            // console.log(rows);
            if (err) {
                return reject(err);
            } else {
                let list = Object.values(JSON.parse(JSON.stringify(rows)));

                resolve({list, res});
            }
        });
    });

    //chiedo tutti i dati dei film
    filters.then(function ({list, res}) {
        console.log("RES NEL THEN");

        var genres = removeDuplicatesByProps(list.filter(obj => obj.local_name === "genre"));
        var titleType = removeDuplicatesByProps(list.filter(obj => obj.local_name === "titleType"));
        var titleLanguage = removeDuplicatesByProps(list.filter(obj => obj.local_name === "titleLanguage"));
        var productionCountry = removeDuplicatesByProps(list.filter(obj => obj.local_name === "productionCompanyCountry"));
        var productionName = removeDuplicatesByProps(list.filter(obj => obj.local_name === "productionCompanyName"));
        var dateTypology = removeDuplicatesByProps(list.filter(obj => obj.local_name === "dateTypology"));
        var locusIRITypes = removeDuplicatesByProps(list.filter(obj => obj.local_name === "hasIRIType"));
        var directorsNames = removeDuplicatesByProps(list.filter(obj => obj.local_name === "directorName"));

        /*linguaggio e stile*/
        var lighting = removeDuplicatesByProps(list.filter(obj => obj.local_name === "lighting"));
        var cameraAngle = removeDuplicatesByProps(list.filter(obj => obj.local_name === "cameraAngle"));
        var tilt = removeDuplicatesByProps(list.filter(obj => obj.local_name === "tilt"));
        var cameraShotType = removeDuplicatesByProps(list.filter(obj => obj.local_name === "cameraShotType"));
        var matte = removeDuplicatesByProps(list.filter(obj => obj.local_name === "hasMatte"));
        var pointOfView = removeDuplicatesByProps(list.filter(obj => obj.local_name === "cameraPlacement"));
        var cameraMotion = removeDuplicatesByProps(list.filter(obj => obj.local_name === "cameraMotion"));
        var colouring = removeDuplicatesByProps(list.filter(obj => obj.local_name === "colouring"));

        var presentPersonCastMemberName = removeDuplicatesByProps(list.filter(obj => obj.local_name === "presentPersonCastMemberName"));
        var presentPersonCharacterName = removeDuplicatesByProps(list.filter(obj => obj.local_name === "presentPersonCharacterName"));

        var castMemberName = list.filter(obj => obj.local_name === "castMemberName");
        var otherCastMemberName = list.filter(obj => obj.local_name === "otherCastMemberName");
        var characterName = removeDuplicatesByProps(list.filter(obj => obj.local_name === "characterName"));
        var filmCast = [];

        castMemberName.forEach(item1 => {
            const correspondingItems = otherCastMemberName.filter(item2 => item2.resource_id === item1.resource_id);

            if (correspondingItems.length > 0) {
                const names = correspondingItems.map(item => item.value).join(", ");
                filmCast.push({id: item1.resource_id, value: `${item1.value} (${names})`});
            } else {
                filmCast.push({id: item1.resource_id, value: `${item1.value}`});
            }
        });

        //Remov duplicates form filmCast
        // Utilizzo di un oggetto di appoggio per tracciare i valori già visti
        var uniqueValues = {};
        filmCast = filmCast.filter(obj => {
            if (!uniqueValues[obj.value]) {
                uniqueValues[obj.value] = true;
                return true;
            }
            return false;
        });

        var result = {
            genres: genres.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            titleType: titleType.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            titleLanguage: titleLanguage.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            productionCountry: productionCountry.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            productionName: productionName.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            dateTypology: dateTypology.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            locusIRITypes: locusIRITypes.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            directorsNames: directorsNames.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            lighting: lighting.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            cameraAngle: cameraAngle.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            tilt: tilt.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            cameraShotType: cameraShotType.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            matte: matte.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            pointOfView: pointOfView.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            cameraMotion: cameraMotion.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            colouring: colouring.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            presentPersonCastMemberName: presentPersonCastMemberName.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            presentPersonCharacterName: presentPersonCharacterName.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            characterName: characterName.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'})),
            filmCast: filmCast.sort((a, b) => a.value.localeCompare(b.value, 'it', {sensitivity: 'base'}))
        }
        //list = list.map(film => film.resource_id);
        //console.log("LISTA IDDDDDD");
        //console.log(list);

        //res.writeHead(200, {"Content-Type": "application/json"});
        res.json(result);

        con.end();
    });


    filters.catch(function ({list, res}) {
        //res.writeHead(200, {"Content-Type": "text"});
        res.json({message: 'Si è verificato un errore nella richiesta'});

        con.end();
    });

}


function getLocusTypes(res, req) {


    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    const queries = [`START TRANSACTION`,

        `WITH tabella_unica AS (
            SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value
            FROM value v
                     JOIN property p ON v.property_id = p.id
        )
        
        SELECT DISTINCT t4.value, t4.local_name, rc.local_name AS class_name
        FROM tabella_unica t1
                 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
                 JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                 JOIN tabella_unica t4 ON t3.value_resource_id = t4.resource_id
                 JOIN resource r ON t1.resource_id = r.id
                 JOIN resource_class rc ON r.resource_class_id = rc.id
        WHERE
            (t4.local_name = 'typeName' AND rc.local_name = 'LocusCatalogueRecord')
        
        UNION
        
        SELECT DISTINCT t3.value, t3.local_name, rc.local_name AS class_name
        FROM tabella_unica t1
                 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
                 JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                 JOIN resource r ON t1.resource_id = r.id
                 JOIN resource_class rc ON r.resource_class_id = rc.id
        WHERE
            (t3.local_name = 'type' AND rc.local_name IN ('PlaceRepresentationCatalogueRecord', 'LocusCatalogueRecord'))
        
        UNION
        
        SELECT distinct value, local_name, null from tabella_unica where local_name = "seasonInNarrative"
        UNION
        SELECT distinct value, local_name, null from tabella_unica where local_name = "partOfDayInNarrative"
        UNION
        SELECT distinct value, local_name, null from tabella_unica where local_name = "weatherConditionsInNarrative";`,

        `COMMIT;`, // Aggiungi altre query qui
    ];

    var results = []; // Array per salvare i risultati della terza query

    function executeBatchQueries(queries, index = 0) {
        if (index < queries.length) {
            const query = queries[index];
            con.query(query, (error, queryResults) => {
                if (error) {
                    con.rollback(() => {
                        console.error('Errore nell\'esecuzione della query:', error);
                        con.end();
                    });
                } else {
                    console.log('Query eseguita con successo:', query);
                    if (index === 1) { // Verifica se questa è la terza query (l'indice 2)
                        console.log('Risultati della terza query:', queryResults);

                        var locusTypeName = queryResults.filter(obj => obj.local_name === "typeName" && obj.class_name === "LocusCatalogueRecord").map(obj => obj.value);
                        var locusType = queryResults.filter(obj => obj.local_name === "type" && obj.class_name === "LocusCatalogueRecord").map(obj => obj.value);

                        var otherEntitiesTypeName = queryResults.filter(obj => obj.local_name === "typeName" && obj.class_name === "PlaceRepresentationCatalogueRecord").map(obj => obj.value);
                        var otherEntitiesType = queryResults.filter(obj => obj.local_name === "type" && obj.class_name === "PlaceRepresentationCatalogueRecord").map(obj => obj.value);

                        var season = queryResults.filter(obj => obj.local_name === "seasonInNarrative").map(obj => obj.value);
                        var weather = queryResults.filter(obj => obj.local_name === "weatherConditionsInNarrative").map(obj => obj.value);
                        var partOfDay = queryResults.filter(obj => obj.local_name === "partOfDayInNarrative").map(obj => obj.value);

                        results = {
                            locusType: locusType.sort((a, b) => a.localeCompare(b, 'it', {sensitivity: 'base'})),
                            locusTypeName: locusTypeName.sort((a, b) => a.localeCompare(b, 'it', {sensitivity: 'base'})),
                            otherEntitiesType: otherEntitiesType.sort((a, b) => a.localeCompare(b, 'it', {sensitivity: 'base'})),
                            otherEntitiesTypeName: otherEntitiesTypeName.sort((a, b) => a.localeCompare(b, 'it', {sensitivity: 'base'})),
                            season: season.sort((a, b) => a.localeCompare(b, 'it', {sensitivity: 'base'})),
                            weather: weather.sort((a, b) => a.localeCompare(b, 'it', {sensitivity: 'base'})),
                            partOfDay: partOfDay.sort((a, b) => a.localeCompare(b, 'it', {sensitivity: 'base'}))
                        };
                        //results = queryResults;
                    }
                }
                executeBatchQueries(queries, index + 1);
            });
        } else {
            // Chiudi la connessione quando tutte le query sono state eseguite
            con.end();
            // Restituisci i risultati della terza query al frontend
            console.log('Risultati finali da restituire al frontend:', results);

            //res.writeHead(200, {"Content-Type": "application/json"});
            res.json(results);

        }
    }

    executeBatchQueries(queries);

}


/**
 * Funzione per ottenere tutti i Locus che fanno parte / sono ubicati nel luogo principale (anche ricorsivamente)
 * esempio:
 * - A fa parte di B
 * - C è ubicato in B
 * - D fa parte di C
 *
 * I luoghi che ottengo a partire da B sono: A, C e D
 *
 * NB! non posso distinguere le relazioni di "parte di" e "ubicato in".
 * */
function getAllLocusRelatedToOne(res, req) {
    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    console.log("LOCUS ID");
    console.log(req.body.locus_id);

    if (req.body.locus_id) {
        //chiedo la lista di film
        var query = `WITH RECURSIVE LocationHierarchy AS (
  SELECT resource_id, property_id, value_resource_id
  FROM value
  WHERE value_resource_id = ${req.body.locus_id} 
    AND property_id IN (957, 959)
  UNION ALL
  SELECT t.resource_id, t.property_id, t.value_resource_id
  FROM value t
  JOIN LocationHierarchy lh ON t.value_resource_id = lh.resource_id
  WHERE (t.property_id IN (957, 959) OR t.property_id = 954)
)
SELECT distinct lh.resource_id, p.local_name, p.label
FROM LocationHierarchy lh1
JOIN property p ON property_id = p.id join LocationHierarchy lh on lh1.resource_id = lh.value_resource_id
WHERE p.local_name <> "hasRelationshipsWithLociData"`;

        let idsSchedeAVofFilm = new Promise((resolve, reject) => {
            con.query(query, (err, rows) => {
                // console.log(rows);
                if (err) {
                    return reject(err);
                } else {
                    let list = Object.values(JSON.parse(JSON.stringify(rows)));

                    resolve({list, res});
                }
            });
        });

        //chiedo tutti i dati dei film
        idsSchedeAVofFilm.then(function ({list, res}) {
            console.log("RES NEL THEN");

            console.log("LISTA PRIMA");
            console.log(list);

            //list = list.map(film => film.resource_id);
            //console.log("LISTA IDDDDDD");
            //console.log(list);

            //res.writeHead(200, {"Content-Type": "application/json"});
            res.json(list);

            con.end();
        });
    } else {
        //res.writeHead(200, {"Content-Type": "text"});
        res.json({message: 'Si è verificato un errore nella richiesta'});


        con.end();
    }
}

function makeInnerQuery(con, res, query, list, returnToClient = true) {
    console.log("SONO IN MEKE INNER QUERY RETURN TO CLIENT : " + returnToClient);
    let prom = new Promise((resolve, reject) => {
        con.query(query, (err, rows) => {
            if (err) {
                return reject(err);
            } else {
                let result = Object.values(JSON.parse(JSON.stringify(rows)));

                var objectReversed = result.reverse();

                var ids = objectReversed.map(item => item["resource_id"]);

                const setIDs = [...new Set(ids)];

                let object = new Map();

                setIDs.forEach(id => {
                    var objWithCurrentID = objectReversed.filter(obj => obj["resource_id"] === id);
                    object.set(id, objWithCurrentID);
                });

                var arr = {};

                object.forEach((value, key) => {
                    arr[key] = {};
                    value.forEach(property => {

                        var propertyObject = {};
                        var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                        propertyObject[propertyName] = property;

                        if (arr[key][propertyName] === undefined) {
                            arr[key][propertyName] = [property];
                        } else {
                            arr[key][propertyName].push(property);
                        }
                    });

                    object.set(key, arr[key]);
                });

                object.forEach((value, key) => {
                    for (let k in value) {
                        value[k].forEach(prop => {
                            if (prop.value_resource_id !== null) {
                                if (prop.value === undefined || prop.value === null) {
                                    prop.value = [];
                                    prop.value.push(object.get(prop.value_resource_id));
                                } else {
                                    prop.value.push(object.get(prop.value_resource_id));
                                }
                            }
                        });
                    }
                });

                var objectListFinal = [];

                list.forEach(id => {
                    objectListFinal.push(object.get(id));
                })

                resolve({objectListFinal, res});
            }
        });
    });

    return prom.then(function ({objectListFinal, res}) {
        console.log("HO OTTWNUTO OBJETCT RESOLVE");

        /*res.writeHead(200, {"Content-Type": "application/json"});
        res.end(
            JSON.stringify(objectListFinal)
        );*/

        //Ordino in ordine alfabetico
        objectListFinal.sort((a, b) => {
            const titleA = a['dcterms:title'][0]['value'].split(':')[1].trim();
            const titleB = b['dcterms:title'][0]['value'].split(':')[1].trim();

            // Usa localeCompare per ordinare in base al titolo (ignorando maiuscole/minuscole)
            return titleA.localeCompare(titleB);
        });

        console.log("DEVO TORNARE GLI OGGETTI");

        con.end();

        if (returnToClient) {
            console.log("RETURN TO CLIENT TRUE QUINDI LI MANDO AL CLIENT");

            try {
                res.json(objectListFinal);
            } catch (e) {
                console.log("SI E' VERIFICATO UN ERRORE QUA - MAKE INNER QUERY RES.JSON");
                console.log(e)
            }
        } else {
            console.log("LI INVIO AL METODO CHIAMANTE");
            return objectListFinal;
        }

    });
}

async function searchFilmWrapper(res, req) {
    cacheMiddleware(req, res, async () => {
        console.log("BODY");
        console.log(req.body);
        var body = JSON.parse(JSON.stringify(req.body));

        console.log("OBJECT FILTERS");
        console.log(body);

        var objectFilmInLocus = {"locus_id": body.locus};

        if (body.locus === null) {
            console.log("NON HO UN LOCUS COME PARAMETRO");
            const [films] = await Promise.all([searchFilm(res, req, body)]);
            console.log("films");
            console.log(films);

            var con = mysql.createConnection({
                host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
            });

            console.log("CHIEDO GLI OGGETTI INTERI DEI FILM");
            getFilmsOfLocus(films, con, res, null);
        } else {
            console.log("HO UN LOCUS COME PARAMETRO");
            const [films, filmsInLocus] = await Promise.all([searchFilm(res, req, body), getFilmsOfLocusByLocusID(res, req, objectFilmInLocus, false)]);
            console.log("films");
            console.log(films);

            console.log("filmsInLocus");
            console.log(filmsInLocus);

            const filmIntersection = intersection(films, filmsInLocus);
            console.log(filmIntersection); // Output: [3, 4, 5]

            var con = mysql.createConnection({
                host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
            });

            console.log("CHIEDO GLI OGGETTI INTERI DEI FILM");
            getFilmsOfLocus(filmIntersection, con, res, null);
        }


        //res.writeHead(200, {"Content-Type": "application/json"});
        //res.end(JSON.stringify(filmIntersection));
    });
}

async function searchLocusWrapper(res, req) {
    cacheMiddleware(req, res, async () => {
        //console.log("BODY");
        //console.log(req.body);
        var body = JSON.parse(JSON.stringify(req.body));

        //console.log("OBJECT FILTERS");

        //console.log(body);

        if ((body.type === undefined || body.type === null || body.type === "") && (body.placeGeoJSON === undefined || body.placeGeoJSON === null || body.placeGeoJSON === "")) {
            //TODO: restituire tutti i luoghi homepage DB
            var objectListFinal = await getAllLocusHomepageDB(res, false);
            console.log("HO OTTENUTO TUTTI I LUOGHI");
            console.log(objectListFinal);

            //Filtro per reale immaginario
            console.log("body.real_immaginary");
            console.log(body.real_immaginary);
            if (body.real_immaginary) {

                var filter = body.real_immaginary === "real" ? "Reale" : "Immaginario";
                var locusListFinal = [];
                objectListFinal.forEach(obj => {
                    if (obj["filocro:hasBasicCharacterizationData"] && obj["filocro:hasBasicCharacterizationData"][0]["value"][0]["filocro:realityStatus"]) {
                        //console.log("ECCOLO!!!");
                        //console.log(obj["filocro:hasBasicCharacterizationData"][0]["value"][0]["filocro:realityStatus"]);

                        if (obj["filocro:hasBasicCharacterizationData"][0]["value"][0]["filocro:realityStatus"][0]["value"] === filter) {
                            locusListFinal.push(obj);
                        }
                    }
                });

                ///
                res.json(locusListFinal);
            } else {
                res.json(objectListFinal);
            }
        } else if (body.placeGeoJSON === undefined || body.placeGeoJSON === null || body.placeGeoJSON === "") {
            //ho solo il tipo di luogo
            //TODO: restituire i luoghi che hanno un certo tipo + luoghi che hanno un locus nel tempo che hanno un certo tipo!!!!

            const queries = [`START TRANSACTION`,

                `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
                    SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value
                    FROM value v
                             JOIN property p ON v.property_id = p.id;`];

            var query = "";
            //Recupero i luoghi che hanno quel tipo selezionato e anche quei luoghi che hanno un locus nel tempo con quel tipo selezionato
            if (body.typename_freetype === "type_name") {
                query = `SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id JOIN tabella_unica t4 ON t3.value_resource_id = t4.resource_id
                            WHERE t1.local_name = "hasBasicCharacterizationData" AND t2.local_name = "hasTypeData" AND t3.local_name = "hasIRITypeData" AND t4.local_name="typeName" AND t4.value = '${body.type}'
                          UNION
                         SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id JOIN tabella_unica t4 ON t3.value_resource_id = t4.resource_id
                            WHERE t1.local_name = "hasLocusOverTimeData" AND t2.local_name = "hasTypeData" AND t3.local_name = "hasIRITypeData" AND t4.local_name="typeName" AND t4.value = '${body.type}';`;
            } else if (body.typename_freetype === "free_type") {
                query = `SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                            WHERE t1.local_name = "hasBasicCharacterizationData" AND t2.local_name = "hasTypeData" AND t3.local_name = "type" AND t3.value = '${body.type}'
                          UNION
                         SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                            WHERE t1.local_name = "hasLocusOverTimeData" AND t2.local_name = "hasTypeData" AND t3.local_name = "type" AND t3.value = '${body.type}';`;
            }

            console.log("\n\n\nQUERY:");
            console.log(query);


            var q = `
                    WITH RECURSIVE test as ( 
                        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
                        FROM value as v1 
                        WHERE v1.resource_id IN (SELECT * FROM locus_with_type)
                    UNION
                    (
                      SELECT
                        v2.resource_id,
                        v2.property_id,
                        v2.value_resource_id,
                        v2.value,
                        v2.uri
                      FROM
                        value as v2
                        INNER JOIN test ON test.value_resource_id = v2.resource_id
                    )
                  )
                  select
                    test.resource_id,
                    test.property_id,
                    test.value_resource_id,
                    test.value,
                    property.local_name as property_name,
                    property.label as property_label,
                    vocabulary.prefix as vocabulary_prefix,
                    r2.local_name,
                    r2.label,
                    m.storage_id as media_link,
                    test.uri as uri_link
                  from
                    test
                    join property on test.property_id = property.id
                    join vocabulary on property.vocabulary_id = vocabulary.id
                    join resource as r1 on test.resource_id = r1.id
                    join resource_class as r2 on r1.resource_class_id = r2.id
                    left join media as m on test.resource_id = m.item_id
                  where property.local_name IN ("title", "hasBasicCharacterizationData", "realityStatus",  "name", "description", "hasImageData", "hasTypeData", "hasIRITypeData", "type", "hasIRIType", "typeName");`;

            queries.push("CREATE TEMPORARY TABLE locus_with_type AS \n" + query);
            queries.push(q);
            queries.push(query);

            queries.push("COMMIT;");

            console.log("\n\n\nQ:");
            console.log(q);

            var con = mysql.createConnection({
                host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
            });


            var results = []; // Array per salvare i risultati della terza query
            var list = [];

            function executeBatchQueries(queries, index = 0) {
                if (index < queries.length) {
                    const query = queries[index];
                    con.query(query, (error, queryResults) => {
                        if (error) {
                            con.rollback(() => {
                                console.error('Errore nell\'esecuzione della query:', error);
                                con.end();
                            });
                        } else {
                            //console.log('Query eseguita con successo:', query);
                            if (index === 3) { // Verifica se questa è la terza query (l'indice 2)
                                //console.log('Risultati della terza query:', queryResults);
                                results = queryResults;
                            } else if (index === 4) {
                                //console.log("\n\nLISTA IDS LUOGHI CON TIPO DATO");
                                list = queryResults.map(res => res.resource_id);
                                //console.log("LIST");
                                //console.log(list);
                            }
                        }
                        executeBatchQueries(queries, index + 1);
                    });
                } else {
                    // Chiudi la connessione quando tutte le query sono state eseguite
                    con.end();
                    // Restituisci i risultati della terza query al frontend
                    //console.log('Risultati finali da restituire al frontend:', results);

                    let result = Object.values(JSON.parse(JSON.stringify(results)));

                    var objectReversed = result.reverse();

                    var ids = objectReversed.map(item => item["resource_id"]);

                    const setIDs = [...new Set(ids)];

                    let object = new Map();

                    setIDs.forEach(id => {
                        var objWithCurrentID = objectReversed.filter(obj => obj["resource_id"] === id);
                        object.set(id, objWithCurrentID);
                    });

                    var arr = {};

                    object.forEach((value, key) => {
                        arr[key] = {};
                        value.forEach(property => {

                            var propertyObject = {};
                            var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                            propertyObject[propertyName] = property;

                            if (arr[key][propertyName] === undefined) {
                                arr[key][propertyName] = [property];
                            } else {
                                arr[key][propertyName].push(property);
                            }
                        });

                        object.set(key, arr[key]);
                    });

                    object.forEach((value, key) => {
                        for (let k in value) {
                            value[k].forEach(prop => {
                                if (prop.value_resource_id !== null) {
                                    if (prop.value === undefined || prop.value === null) {
                                        prop.value = [];
                                        prop.value.push(object.get(prop.value_resource_id));
                                    } else {
                                        prop.value.push(object.get(prop.value_resource_id));
                                    }
                                }
                            });
                        }
                    });

                    var objectListFinal = [];

                    list.forEach(id => {
                        objectListFinal.push(object.get(id));
                    })

                    //Ordino in ordine alfabetico
                    objectListFinal.sort((a, b) => {
                        const titleA = a['dcterms:title'][0]['value'].split(':')[1].trim();
                        const titleB = b['dcterms:title'][0]['value'].split(':')[1].trim();

                        // Usa localeCompare per ordinare in base al titolo (ignorando maiuscole/minuscole)
                        return titleA.localeCompare(titleB);
                    });

                    console.log("\n\n\nobjectListFinal");
                    console.log(objectListFinal);


                    //Filtro per reale immaginario: funziona!!!!!!

                    console.log("body.real_immaginary");
                    console.log(body.real_immaginary);
                    if (body.real_immaginary) {

                        var filter = body.real_immaginary === "real" ? "Reale" : "Immaginario";
                        var locusListFinal = [];
                        objectListFinal.forEach(obj => {
                            if (obj["filocro:hasBasicCharacterizationData"] && obj["filocro:hasBasicCharacterizationData"][0]["value"][0]["filocro:realityStatus"]) {
                                //console.log("ECCOLO!!!");
                                //console.log(obj["filocro:hasBasicCharacterizationData"][0]["value"][0]["filocro:realityStatus"]);

                                if (obj["filocro:hasBasicCharacterizationData"][0]["value"][0]["filocro:realityStatus"][0]["value"] === filter) {
                                    locusListFinal.push(obj);
                                }
                            }
                        });

                        ///
                        res.json(locusListFinal);
                    } else {
                        res.json(objectListFinal);
                    }


                    //res.writeHead(200, {"Content-Type": "application/json"});


                }
            }

            executeBatchQueries(queries);


        } else if (body.type === undefined || body.type === null || body.type === "") {
            //ho solo il luogo selezionato
            //TODO: restituire i luoghi connessi a quello selezionato

            //const [locus] = await Promise.all([getAllLocusWithMapInfoDB(res, false)]);

            //console.log("\n\n\nLOCUS OTTENUTI");
            //console.log(locus);

            //const locusIDsResults = await getLocusInRegionIDs(locus, null, body.placeGeoJSON, null, "Search Locus");
            //console.log("\n\n\n\nHO OTTENUTI I LOCUS CHE STANNO NELLA REGIONE GEOGRAFICA");
            //console.log(locusIDsResults);

            console.log("ORA RECUPERO I LUOGHI CHET STANNO ALL'INTERNO DI ESSI");

            var queries = [];

            var query = `SELECT distinct v1.resource_id
                        FROM value as v1
                        WHERE FIND_IN_SET(v1.resource_id, (SELECT GROUP_CONCAT(ID SEPARATOR ',') AS All_List
                        FROM (
                            SELECT ID FROM LocusRelationships WHERE ID IN (${body.placeGeoJSON.value})
                        UNION ALL
                        SELECT DISTINCT Lista_id_connessi AS ID FROM LocusRelationships WHERE ID IN (${body.placeGeoJSON.value}) AND Lista_id_connessi <> ''
                    ) AS CombinedResults))`;

            //TODO: recuperare anche i luoghi che stanno dentro essi
            var q = `
                    WITH RECURSIVE test as ( 
                        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
                        FROM value as v1 
                        WHERE FIND_IN_SET(v1.resource_id, (SELECT GROUP_CONCAT(ID SEPARATOR ',') AS All_List
                                                 FROM (
                                                          SELECT ID FROM LocusRelationships WHERE ID IN (${body.placeGeoJSON.value})
                                                          UNION ALL
                                                          SELECT DISTINCT Lista_id_connessi AS ID FROM LocusRelationships WHERE ID IN (${body.placeGeoJSON.value}) AND Lista_id_connessi <> ''
                                                      ) AS CombinedResults))
                    UNION
                    (
                      SELECT
                        v2.resource_id,
                        v2.property_id,
                        v2.value_resource_id,
                        v2.value,
                        v2.uri
                      FROM
                        value as v2
                        INNER JOIN test ON test.value_resource_id = v2.resource_id
                    )
                  )
                  select
                    test.resource_id,
                    test.property_id,
                    test.value_resource_id,
                    test.value,
                    property.local_name as property_name,
                    property.label as property_label,
                    vocabulary.prefix as vocabulary_prefix,
                    r2.local_name,
                    r2.label,
                    m.storage_id as media_link,
                    test.uri as uri_link
                  from
                    test
                    join property on test.property_id = property.id
                    join vocabulary on property.vocabulary_id = vocabulary.id
                    join resource as r1 on test.resource_id = r1.id
                    join resource_class as r2 on r1.resource_class_id = r2.id
                    left join media as m on test.resource_id = m.item_id
                  where property.local_name IN ("title", "hasBasicCharacterizationData", "realityStatus",  "name", "description", "hasImageData", "hasTypeData", "hasIRITypeData", "type", "hasIRIType", "typeName");`;


            queries.push(q);
            queries.push(query);

            console.log("\n\n\nQ:");
            console.log(q);

            var con = mysql.createConnection({
                host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
            });


            var results = []; // Array per salvare i risultati della terza query
            var list = [];

            function executeBatchQueries(queries, index = 0) {
                if (index < queries.length) {
                    const query = queries[index];
                    con.query(query, (error, queryResults) => {
                        if (error) {
                            con.rollback(() => {
                                console.error('Errore nell\'esecuzione della query:', error);
                                con.end();
                            });
                        } else {
                            //console.log('Query eseguita con successo:', query);
                            if (index === 0) { // Verifica se questa è la terza query (l'indice 2)
                                //console.log('Risultati della terza query:', queryResults);
                                results = queryResults;
                            } else if (index === 1) {
                                //console.log("\n\nLISTA IDS LUOGHI CON TIPO DATO");
                                list = queryResults.map(res => res.resource_id);
                                //console.log("LIST");
                                //console.log(list);
                            }
                        }
                        executeBatchQueries(queries, index + 1);
                    });
                } else {
                    // Chiudi la connessione quando tutte le query sono state eseguite
                    con.end();
                    // Restituisci i risultati della terza query al frontend
                    //console.log('Risultati finali da restituire al frontend:', results);

                    let result = Object.values(JSON.parse(JSON.stringify(results)));

                    var objectReversed = result.reverse();

                    var ids = objectReversed.map(item => item["resource_id"]);

                    const setIDs = [...new Set(ids)];

                    let object = new Map();

                    setIDs.forEach(id => {
                        var objWithCurrentID = objectReversed.filter(obj => obj["resource_id"] === id);
                        object.set(id, objWithCurrentID);
                    });

                    var arr = {};

                    object.forEach((value, key) => {
                        arr[key] = {};
                        value.forEach(property => {

                            var propertyObject = {};
                            var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                            propertyObject[propertyName] = property;

                            if (arr[key][propertyName] === undefined) {
                                arr[key][propertyName] = [property];
                            } else {
                                arr[key][propertyName].push(property);
                            }
                        });

                        object.set(key, arr[key]);
                    });

                    object.forEach((value, key) => {
                        for (let k in value) {
                            value[k].forEach(prop => {
                                if (prop.value_resource_id !== null) {
                                    if (prop.value === undefined || prop.value === null) {
                                        prop.value = [];
                                        prop.value.push(object.get(prop.value_resource_id));
                                    } else {
                                        prop.value.push(object.get(prop.value_resource_id));
                                    }
                                }
                            });
                        }
                    });

                    var objectListFinal = [];

                    list.forEach(id => {
                        objectListFinal.push(object.get(id));
                    })

                    //Ordino in ordine alfabetico
                    objectListFinal.sort((a, b) => {
                        const titleA = a['dcterms:title'][0]['value'].split(':')[1].trim();
                        const titleB = b['dcterms:title'][0]['value'].split(':')[1].trim();

                        // Usa localeCompare per ordinare in base al titolo (ignorando maiuscole/minuscole)
                        return titleA.localeCompare(titleB);
                    });


                    //Filtro per reale immaginario
                    console.log("body.real_immaginary");
                    console.log(body.real_immaginary);
                    if (body.real_immaginary) {

                        var filter = body.real_immaginary === "real" ? "Reale" : "Immaginario";
                        var locusListFinal = [];
                        objectListFinal.forEach(obj => {
                            if (obj["filocro:hasBasicCharacterizationData"] && obj["filocro:hasBasicCharacterizationData"][0]["value"][0]["filocro:realityStatus"]) {
                                //console.log("ECCOLO!!!");
                                //console.log(obj["filocro:hasBasicCharacterizationData"][0]["value"][0]["filocro:realityStatus"]);

                                if (obj["filocro:hasBasicCharacterizationData"][0]["value"][0]["filocro:realityStatus"][0]["value"] === filter) {
                                    locusListFinal.push(obj);
                                }
                            }
                        });

                        ///
                        res.json(locusListFinal);
                    } else {
                        res.json(objectListFinal);
                    }

                    //res.json(objectListFinal);

                }
            }

            executeBatchQueries(queries);
            /*
            var locusObjectsResult = [];
            locus.forEach(loc => {
                console.log("loc[\"dcterms:title\"][0][\"resource_id\"]: " + loc["dcterms:title"][0]["resource_id"]);
                if (locusIDsResults.locusInRegionIDs.includes(loc["dcterms:title"][0]["resource_id"])) {
                    locusObjectsResult.push(loc);
                }
            });

            console.log("\n\n\nlocusObjectsResult");
            console.log(locusObjectsResult);

            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(locusObjectsResult));

             */

        } else {
            console.log("HO SIA IL LUOGO CHE IL TIPO");
            //ho sia il luogo che il tipo
            //TODO: trovare i luoghi con un certo tipo INTERSECANDO con quelli che stanno nel luogo selezionato

            const queries = [`START TRANSACTION`,

                `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
                    SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value
                    FROM value v
                             JOIN property p ON v.property_id = p.id;`];

            var query_locus_with_selected_type = "";
            //Recupero i luoghi che hanno quel tipo selezionato e anche quei luoghi che hanno un locus nel tempo con quel tipo selezionato
            if (body.typename_freetype === "type_name") {
                query_locus_with_selected_type = `SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id JOIN tabella_unica t4 ON t3.value_resource_id = t4.resource_id
                            WHERE t1.local_name = "hasBasicCharacterizationData" AND t2.local_name = "hasTypeData" AND t3.local_name = "hasIRITypeData" AND t4.local_name="typeName" AND t4.value = '${body.type}'
                          UNION
                         SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id JOIN tabella_unica t4 ON t3.value_resource_id = t4.resource_id
                            WHERE t1.local_name = "hasLocusOverTimeData" AND t2.local_name = "hasTypeData" AND t3.local_name = "hasIRITypeData" AND t4.local_name="typeName" AND t4.value = '${body.type}'`;
            } else if (body.typename_freetype === "free_type") {
                query_locus_with_selected_type = `SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                            WHERE t1.local_name = "hasBasicCharacterizationData" AND t2.local_name = "hasTypeData" AND t3.local_name = "type" AND t3.value = '${body.type}'
                          UNION
                         SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                            WHERE t1.local_name = "hasLocusOverTimeData" AND t2.local_name = "hasTypeData" AND t3.local_name = "type" AND t3.value = '${body.type}'`;
            }

            console.log("\n\n\nQUERY:");
            console.log(query);

            var query = `SELECT distinct v1.resource_id
                        FROM value as v1
                        WHERE FIND_IN_SET(v1.resource_id, (SELECT GROUP_CONCAT(ID SEPARATOR ',') AS All_List
                        FROM (
                            SELECT ID FROM LocusRelationships WHERE ID IN (${body.placeGeoJSON.value})
                        UNION ALL
                        SELECT DISTINCT Lista_id_connessi AS ID FROM LocusRelationships WHERE ID IN (${body.placeGeoJSON.value}) AND Lista_id_connessi <> ''
                    ) AS CombinedResults)) INTERSECT 
                    
                    SELECT * FROM(
                        ${query_locus_with_selected_type}
                    ) as locus_with_selected_type`;

            console.log("\n\n\nQUERY:");
            console.log(query);


            var q = `
                    WITH RECURSIVE test as ( 
                        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
                        FROM value as v1 
                        WHERE v1.resource_id IN (${query})
                    UNION
                    (
                      SELECT
                        v2.resource_id,
                        v2.property_id,
                        v2.value_resource_id,
                        v2.value,
                        v2.uri
                      FROM
                        value as v2
                        INNER JOIN test ON test.value_resource_id = v2.resource_id
                    )
                  )
                  select
                    test.resource_id,
                    test.property_id,
                    test.value_resource_id,
                    test.value,
                    property.local_name as property_name,
                    property.label as property_label,
                    vocabulary.prefix as vocabulary_prefix,
                    r2.local_name,
                    r2.label,
                    m.storage_id as media_link,
                    test.uri as uri_link
                  from
                    test
                    join property on test.property_id = property.id
                    join vocabulary on property.vocabulary_id = vocabulary.id
                    join resource as r1 on test.resource_id = r1.id
                    join resource_class as r2 on r1.resource_class_id = r2.id
                    left join media as m on test.resource_id = m.item_id
                where property.local_name IN ("title", "hasBasicCharacterizationData", "realityStatus",  "name", "description", "hasImageData", "hasTypeData", "hasIRITypeData", "type", "hasIRIType", "typeName", "hasMapReferenceData", "mapReferenceIRI", "mapReferenceTextualData");`;


            queries.push(q);
            queries.push(query + ";");

            queries.push("COMMIT;");

            console.log("\n\n\nQ:");
            console.log(q);

            var con = mysql.createConnection({
                host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
            });


            var results = []; // Array per salvare i risultati della terza query
            var list = [];

            async function executeBatchQueries(queries, index = 0) {
                if (index < queries.length) {
                    const query = queries[index];
                    con.query(query, (error, queryResults) => {
                        if (error) {
                            con.rollback(() => {
                                console.error('Errore nell\'esecuzione della query:', error);
                                con.end();
                            });
                        } else {
                            console.log('Query eseguita con successo:', query);
                            if (index === 2) { // Verifica se questa è la terza query (l'indice 2)
                                console.log('Risultati della terza query:', queryResults);
                                results = queryResults;
                            } else if (index === 3) {
                                console.log("\n\nLISTA IDS LUOGHI TROVATI");
                                list = queryResults.map(res => res.resource_id);
                                console.log("LIST");
                                console.log(list);
                            }
                        }
                        executeBatchQueries(queries, index + 1);
                    });
                } else {
                    // Chiudi la connessione quando tutte le query sono state eseguite
                    con.end();
                    // Restituisci i risultati della terza query al frontend
                    console.log("\n\n\n\nOra verifico quali stanno nell'area geografica");

                    //res.writeHead(200, {"Content-Type": "application/json"});
                    //res.end(JSON.stringify(results));


                    //PARTE NUOVA

                    let result = Object.values(JSON.parse(JSON.stringify(results)));

                    var objectReversed = result.reverse();

                    var ids = objectReversed.map(item => item["resource_id"]);

                    const setIDs = [...new Set(ids)];

                    let object = new Map();

                    setIDs.forEach(id => {
                        var objWithCurrentID = objectReversed.filter(obj => obj["resource_id"] === id);
                        object.set(id, objWithCurrentID);
                    });

                    var arr = {};

                    object.forEach((value, key) => {
                        arr[key] = {};
                        value.forEach(property => {

                            var propertyObject = {};
                            var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                            propertyObject[propertyName] = property;

                            if (arr[key][propertyName] === undefined) {
                                arr[key][propertyName] = [property];
                            } else {
                                arr[key][propertyName].push(property);
                            }
                        });

                        object.set(key, arr[key]);
                    });

                    object.forEach((value, key) => {
                        for (let k in value) {
                            value[k].forEach(prop => {
                                if (prop.value_resource_id !== null) {
                                    if (prop.value === undefined || prop.value === null) {
                                        prop.value = [];
                                        prop.value.push(object.get(prop.value_resource_id));
                                    } else {
                                        prop.value.push(object.get(prop.value_resource_id));
                                    }
                                }
                            });
                        }
                    });

                    var objectListFinal = [];

                    list.forEach(id => {
                        objectListFinal.push(object.get(id));
                    })

                    console.log("\n\n\nobjectListFinal");
                    console.log(objectListFinal);
                    ///

                    /*
                    var locus = objectListFinal;
                    const locusIDsResults = await getLocusInRegionIDs(locus, null, body.placeGeoJSON, null, "Search Locus");
                    console.log("\n\n\n\nHO OTTENUTI I LOCUS CHE STANNO NELLA REGIONE GEOGRAFICA");
                    console.log(locusIDsResults);

                    var locusObjectsResult = [];
                    locus.forEach(loc => {
                        console.log("loc[\"dcterms:title\"][0][\"resource_id\"]: " + loc["dcterms:title"][0]["resource_id"]);
                        if (locusIDsResults.locusInRegionIDs.includes(loc["dcterms:title"][0]["resource_id"])) {
                            locusObjectsResult.push(loc);
                        }
                    });

                    console.log("\n\n\nlocusObjectsResult");
                    console.log(locusObjectsResult);

                     */

                    //Ordino in ordine alfabetico
                    objectListFinal.sort((a, b) => {
                        const titleA = a['dcterms:title'][0]['value'].split(':')[1].trim();
                        const titleB = b['dcterms:title'][0]['value'].split(':')[1].trim();

                        // Usa localeCompare per ordinare in base al titolo (ignorando maiuscole/minuscole)
                        return titleA.localeCompare(titleB);
                    });

                    //Filtro per reale immaginario
                    console.log("body.real_immaginary");
                    console.log(body.real_immaginary);
                    if (body.real_immaginary) {

                        var filter = body.real_immaginary === "real" ? "Reale" : "Immaginario";
                        var locusListFinal = [];
                        objectListFinal.forEach(obj => {
                            if (obj["filocro:hasBasicCharacterizationData"] && obj["filocro:hasBasicCharacterizationData"][0]["value"][0]["filocro:realityStatus"]) {
                                //console.log("ECCOLO!!!");
                                //console.log(obj["filocro:hasBasicCharacterizationData"][0]["value"][0]["filocro:realityStatus"]);

                                if (obj["filocro:hasBasicCharacterizationData"][0]["value"][0]["filocro:realityStatus"][0]["value"] === filter) {
                                    locusListFinal.push(obj);
                                }
                            }
                        });

                        ///
                        res.json(locusListFinal);
                    } else {
                        res.json(objectListFinal);
                    }

                    //res.writeHead(200, {"Content-Type": "application/json"});
                    //res.json(locusObjectsResult);

                }
            }

            executeBatchQueries(queries);
        }


        //res.writeHead(200, {"Content-Type": "application/json"});
        //res.end(JSON.stringify(filmIntersection));
    });
}

async function searchLocusWrapperOld(res, req) {
    cacheMiddleware(req, res, async () => {
        //console.log("BODY");
        //console.log(req.body);
        var body = JSON.parse(JSON.stringify(req.body));

        //console.log("OBJECT FILTERS");

        //console.log(body);

        if ((body.type === undefined || body.type === null || body.type === "") && (body.placeGeoJSON === undefined || body.placeGeoJSON === null || body.placeGeoJSON === "")) {
            //TODO: restituire tutti i luoghi homepage DB
            getAllLocusHomepageDB(res, true);
        } else if (body.placeGeoJSON === undefined || body.placeGeoJSON === null || body.placeGeoJSON === "") {
            //TODO: restituire i luoghi che hanno un certo tipo + luoghi che hanno un locus nel tempo che hanno un certo tipo!!!!

            const queries = [`START TRANSACTION`,

                `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
                    SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value
                    FROM value v
                             JOIN property p ON v.property_id = p.id;`];

            var query = "";
            //Recupero i luoghi che hanno quel tipo selezionato e anche quei luoghi che hanno un locus nel tempo con quel tipo selezionato
            if (body.typename_freetype === "type_name") {
                query = `SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id JOIN tabella_unica t4 ON t3.value_resource_id = t4.resource_id
                            WHERE t1.local_name = "hasBasicCharacterizationData" AND t2.local_name = "hasTypeData" AND t3.local_name = "hasIRITypeData" AND t4.local_name="typeName" AND t4.value = '${body.type}'
                          UNION
                         SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id JOIN tabella_unica t4 ON t3.value_resource_id = t4.resource_id
                            WHERE t1.local_name = "hasLocusOverTimeData" AND t2.local_name = "hasTypeData" AND t3.local_name = "hasIRITypeData" AND t4.local_name="typeName" AND t4.value = '${body.type}'`;
            } else if (body.typename_freetype === "free_type") {
                query = `SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                            WHERE t1.local_name = "hasBasicCharacterizationData" AND t2.local_name = "hasTypeData" AND t3.local_name = "type" AND t3.value = '${body.type}'
                          UNION
                         SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                            WHERE t1.local_name = "hasLocusOverTimeData" AND t2.local_name = "hasTypeData" AND t3.local_name = "type" AND t3.value = '${body.type}'`;
            }

            console.log("\n\n\nQUERY:");
            console.log(query);


            var q = `
                    WITH RECURSIVE test as ( 
                        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
                        FROM value as v1 
                        WHERE v1.resource_id IN (${query})
                    UNION
                    (
                      SELECT
                        v2.resource_id,
                        v2.property_id,
                        v2.value_resource_id,
                        v2.value,
                        v2.uri
                      FROM
                        value as v2
                        INNER JOIN test ON test.value_resource_id = v2.resource_id
                    )
                  )
                  select
                    test.resource_id,
                    test.property_id,
                    test.value_resource_id,
                    test.value,
                    property.local_name as property_name,
                    property.label as property_label,
                    vocabulary.prefix as vocabulary_prefix,
                    r2.local_name,
                    r2.label,
                    m.storage_id as media_link,
                    test.uri as uri_link
                  from
                    test
                    join property on test.property_id = property.id
                    join vocabulary on property.vocabulary_id = vocabulary.id
                    join resource as r1 on test.resource_id = r1.id
                    join resource_class as r2 on r1.resource_class_id = r2.id
                    left join media as m on test.resource_id = m.item_id
                  where property.local_name IN ("title", "hasBasicCharacterizationData", "realityStatus",  "name", "description", "hasImageData", "hasTypeData", "hasIRITypeData", "type", "hasIRIType", "typeName");`;


            queries.push(q);
            queries.push(query);

            queries.push("COMMIT;");

            console.log("\n\n\nQ:");
            console.log(q);

            var con = mysql.createConnection({
                host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
            });


            var results = []; // Array per salvare i risultati della terza query
            var list = [];

            function executeBatchQueries(queries, index = 0) {
                if (index < queries.length) {
                    const query = queries[index];
                    con.query(query, (error, queryResults) => {
                        if (error) {
                            con.rollback(() => {
                                console.error('Errore nell\'esecuzione della query:', error);
                                con.end();
                            });
                        } else {
                            //console.log('Query eseguita con successo:', query);
                            if (index === 2) { // Verifica se questa è la terza query (l'indice 2)
                                //console.log('Risultati della terza query:', queryResults);
                                results = queryResults;
                            } else if (index === 3) {
                                //console.log("\n\nLISTA IDS LUOGHI CON TIPO DATO");
                                list = queryResults.map(res => res.resource_id);
                                //console.log("LIST");
                                //console.log(list);
                            }
                        }
                        executeBatchQueries(queries, index + 1);
                    });
                } else {
                    // Chiudi la connessione quando tutte le query sono state eseguite
                    con.end();
                    // Restituisci i risultati della terza query al frontend
                    //console.log('Risultati finali da restituire al frontend:', results);

                    let result = Object.values(JSON.parse(JSON.stringify(results)));

                    var objectReversed = result.reverse();

                    var ids = objectReversed.map(item => item["resource_id"]);

                    const setIDs = [...new Set(ids)];

                    let object = new Map();

                    setIDs.forEach(id => {
                        var objWithCurrentID = objectReversed.filter(obj => obj["resource_id"] === id);
                        object.set(id, objWithCurrentID);
                    });

                    var arr = {};

                    object.forEach((value, key) => {
                        arr[key] = {};
                        value.forEach(property => {

                            var propertyObject = {};
                            var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                            propertyObject[propertyName] = property;

                            if (arr[key][propertyName] === undefined) {
                                arr[key][propertyName] = [property];
                            } else {
                                arr[key][propertyName].push(property);
                            }
                        });

                        object.set(key, arr[key]);
                    });

                    object.forEach((value, key) => {
                        for (let k in value) {
                            value[k].forEach(prop => {
                                if (prop.value_resource_id !== null) {
                                    if (prop.value === undefined || prop.value === null) {
                                        prop.value = [];
                                        prop.value.push(object.get(prop.value_resource_id));
                                    } else {
                                        prop.value.push(object.get(prop.value_resource_id));
                                    }
                                }
                            });
                        }
                    });

                    var objectListFinal = [];

                    list.forEach(id => {
                        objectListFinal.push(object.get(id));
                    })

                    //Ordino in ordine alfabetico
                    objectListFinal.sort((a, b) => {
                        const titleA = a['dcterms:title'][0]['value'].split(':')[1].trim();
                        const titleB = b['dcterms:title'][0]['value'].split(':')[1].trim();

                        // Usa localeCompare per ordinare in base al titolo (ignorando maiuscole/minuscole)
                        return titleA.localeCompare(titleB);
                    });

                    console.log("\n\n\nobjectListFinal");
                    console.log(objectListFinal);
                    ///

                    //res.writeHead(200, {"Content-Type": "application/json"});
                    res.json(objectListFinal);

                }
            }

            executeBatchQueries(queries);


        } else if (body.type === undefined || body.type === null || body.type === "") {
            //TODO: restituire i luoghi che stanno nella regione con GeoJSON passato come parametro e recuperare tutti luoghi all'interno tramite locus relationships

            const [locus] = await Promise.all([getAllLocusWithMapInfoDB(res, false)]);

            //console.log("\n\n\nLOCUS OTTENUTI");
            //console.log(locus);

            const locusIDsResults = await getLocusInRegionIDs(locus, null, body.placeGeoJSON, null, "Search Locus");
            //console.log("\n\n\n\nHO OTTENUTI I LOCUS CHE STANNO NELLA REGIONE GEOGRAFICA");
            //console.log(locusIDsResults);

            console.log("ORA RECUPERO I LUOGHI CHET STANNO ALL'INTERNO DI ESSI");

            var queries = [];

            var query = `SELECT distinct v1.resource_id
                        FROM value as v1
                        WHERE FIND_IN_SET(v1.resource_id, (SELECT GROUP_CONCAT(ID SEPARATOR ',') AS All_List
                        FROM (
                            SELECT ID FROM LocusRelationships WHERE ID IN (${locusIDsResults.locusInRegionIDs})
                        UNION ALL
                        SELECT DISTINCT Lista_id_connessi AS ID FROM LocusRelationships WHERE ID IN (${locusIDsResults.locusInRegionIDs}) AND Lista_id_connessi <> ''
                    ) AS CombinedResults))`;

            //TODO: recuperare anche i luoghi che stanno dentro essi
            var q = `
                    WITH RECURSIVE test as ( 
                        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
                        FROM value as v1 
                        WHERE FIND_IN_SET(v1.resource_id, (SELECT GROUP_CONCAT(ID SEPARATOR ',') AS All_List
                                                 FROM (
                                                          SELECT ID FROM LocusRelationships WHERE ID IN (${locusIDsResults.locusInRegionIDs})
                                                          UNION ALL
                                                          SELECT DISTINCT Lista_id_connessi AS ID FROM LocusRelationships WHERE ID IN (${locusIDsResults.locusInRegionIDs}) AND Lista_id_connessi <> ''
                                                      ) AS CombinedResults))
                    UNION
                    (
                      SELECT
                        v2.resource_id,
                        v2.property_id,
                        v2.value_resource_id,
                        v2.value,
                        v2.uri
                      FROM
                        value as v2
                        INNER JOIN test ON test.value_resource_id = v2.resource_id
                    )
                  )
                  select
                    test.resource_id,
                    test.property_id,
                    test.value_resource_id,
                    test.value,
                    property.local_name as property_name,
                    property.label as property_label,
                    vocabulary.prefix as vocabulary_prefix,
                    r2.local_name,
                    r2.label,
                    m.storage_id as media_link,
                    test.uri as uri_link
                  from
                    test
                    join property on test.property_id = property.id
                    join vocabulary on property.vocabulary_id = vocabulary.id
                    join resource as r1 on test.resource_id = r1.id
                    join resource_class as r2 on r1.resource_class_id = r2.id
                    left join media as m on test.resource_id = m.item_id
                  where property.local_name IN ("title", "hasBasicCharacterizationData", "realityStatus",  "name", "description", "hasImageData", "hasTypeData", "hasIRITypeData", "type", "hasIRIType", "typeName");`;


            queries.push(q);
            queries.push(query);

            console.log("\n\n\nQ:");
            console.log(q);

            var con = mysql.createConnection({
                host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
            });


            var results = []; // Array per salvare i risultati della terza query
            var list = [];

            function executeBatchQueries(queries, index = 0) {
                if (index < queries.length) {
                    const query = queries[index];
                    con.query(query, (error, queryResults) => {
                        if (error) {
                            con.rollback(() => {
                                console.error('Errore nell\'esecuzione della query:', error);
                                con.end();
                            });
                        } else {
                            //console.log('Query eseguita con successo:', query);
                            if (index === 0) { // Verifica se questa è la terza query (l'indice 2)
                                //console.log('Risultati della terza query:', queryResults);
                                results = queryResults;
                            } else if (index === 1) {
                                //console.log("\n\nLISTA IDS LUOGHI CON TIPO DATO");
                                list = queryResults.map(res => res.resource_id);
                                //console.log("LIST");
                                //console.log(list);
                            }
                        }
                        executeBatchQueries(queries, index + 1);
                    });
                } else {
                    // Chiudi la connessione quando tutte le query sono state eseguite
                    con.end();
                    // Restituisci i risultati della terza query al frontend
                    //console.log('Risultati finali da restituire al frontend:', results);

                    let result = Object.values(JSON.parse(JSON.stringify(results)));

                    var objectReversed = result.reverse();

                    var ids = objectReversed.map(item => item["resource_id"]);

                    const setIDs = [...new Set(ids)];

                    let object = new Map();

                    setIDs.forEach(id => {
                        var objWithCurrentID = objectReversed.filter(obj => obj["resource_id"] === id);
                        object.set(id, objWithCurrentID);
                    });

                    var arr = {};

                    object.forEach((value, key) => {
                        arr[key] = {};
                        value.forEach(property => {

                            var propertyObject = {};
                            var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                            propertyObject[propertyName] = property;

                            if (arr[key][propertyName] === undefined) {
                                arr[key][propertyName] = [property];
                            } else {
                                arr[key][propertyName].push(property);
                            }
                        });

                        object.set(key, arr[key]);
                    });

                    object.forEach((value, key) => {
                        for (let k in value) {
                            value[k].forEach(prop => {
                                if (prop.value_resource_id !== null) {
                                    if (prop.value === undefined || prop.value === null) {
                                        prop.value = [];
                                        prop.value.push(object.get(prop.value_resource_id));
                                    } else {
                                        prop.value.push(object.get(prop.value_resource_id));
                                    }
                                }
                            });
                        }
                    });

                    var objectListFinal = [];

                    list.forEach(id => {
                        objectListFinal.push(object.get(id));
                    })

                    //Ordino in ordine alfabetico
                    objectListFinal.sort((a, b) => {
                        const titleA = a['dcterms:title'][0]['value'].split(':')[1].trim();
                        const titleB = b['dcterms:title'][0]['value'].split(':')[1].trim();

                        // Usa localeCompare per ordinare in base al titolo (ignorando maiuscole/minuscole)
                        return titleA.localeCompare(titleB);
                    });

                    res.json(objectListFinal);

                }
            }

            executeBatchQueries(queries);
            /*
            var locusObjectsResult = [];
            locus.forEach(loc => {
                console.log("loc[\"dcterms:title\"][0][\"resource_id\"]: " + loc["dcterms:title"][0]["resource_id"]);
                if (locusIDsResults.locusInRegionIDs.includes(loc["dcterms:title"][0]["resource_id"])) {
                    locusObjectsResult.push(loc);
                }
            });

            console.log("\n\n\nlocusObjectsResult");
            console.log(locusObjectsResult);

            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(locusObjectsResult));

             */

        } else {
            //TODO: trovare i luoghi con un certo tipo e di questi vedere quali sono collocati nell'area geografica

            const queries = [`START TRANSACTION`,

                `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
                    SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value
                    FROM value v
                             JOIN property p ON v.property_id = p.id;`];

            var query = "";
            if (body.typename_freetype === "type_name") {
                query = `SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id JOIN tabella_unica t4 ON t3.value_resource_id = t4.resource_id
                            WHERE t1.local_name = "hasBasicCharacterizationData" AND t2.local_name = "hasTypeData" AND t3.local_name = "hasIRITypeData" AND t4.local_name="typeName" AND t4.value = '${body.type}'`;
            } else if (body.typename_freetype === "free_type") {
                query = `SELECT t1.resource_id FROM tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                            WHERE t1.local_name = "hasBasicCharacterizationData" AND t2.local_name = "hasTypeData" AND t3.local_name = "type" AND t3.value = '${body.type}'`;
            }

            console.log("\n\n\nQUERY:");
            console.log(query);


            var q = `
                    WITH RECURSIVE test as ( 
                        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
                        FROM value as v1 
                        WHERE v1.resource_id IN (${query})
                    UNION
                    (
                      SELECT
                        v2.resource_id,
                        v2.property_id,
                        v2.value_resource_id,
                        v2.value,
                        v2.uri
                      FROM
                        value as v2
                        INNER JOIN test ON test.value_resource_id = v2.resource_id
                    )
                  )
                  select
                    test.resource_id,
                    test.property_id,
                    test.value_resource_id,
                    test.value,
                    property.local_name as property_name,
                    property.label as property_label,
                    vocabulary.prefix as vocabulary_prefix,
                    r2.local_name,
                    r2.label,
                    m.storage_id as media_link,
                    test.uri as uri_link
                  from
                    test
                    join property on test.property_id = property.id
                    join vocabulary on property.vocabulary_id = vocabulary.id
                    join resource as r1 on test.resource_id = r1.id
                    join resource_class as r2 on r1.resource_class_id = r2.id
                    left join media as m on test.resource_id = m.item_id
                where property.local_name IN ("title", "hasBasicCharacterizationData", "realityStatus",  "name", "description", "hasImageData", "hasTypeData", "hasIRITypeData", "type", "hasIRIType", "typeName", "hasMapReferenceData", "mapReferenceIRI", "mapReferenceTextualData");`;


            queries.push(q);
            queries.push(query);

            queries.push("COMMIT;");

            console.log("\n\n\nQ:");
            console.log(q);

            var con = mysql.createConnection({
                host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
            });


            var results = []; // Array per salvare i risultati della terza query
            var list = [];

            async function executeBatchQueries(queries, index = 0) {
                if (index < queries.length) {
                    const query = queries[index];
                    con.query(query, (error, queryResults) => {
                        if (error) {
                            con.rollback(() => {
                                console.error('Errore nell\'esecuzione della query:', error);
                                con.end();
                            });
                        } else {
                            console.log('Query eseguita con successo:', query);
                            if (index === 2) { // Verifica se questa è la terza query (l'indice 2)
                                console.log('Risultati della terza query:', queryResults);
                                results = queryResults;
                            } else if (index === 3) {
                                console.log("\n\nLISTA IDS LUOGHI CON TIPO DATO");
                                list = queryResults.map(res => res.resource_id);
                                console.log("LIST");
                                console.log(list);
                            }
                        }
                        executeBatchQueries(queries, index + 1);
                    });
                } else {
                    // Chiudi la connessione quando tutte le query sono state eseguite
                    con.end();
                    // Restituisci i risultati della terza query al frontend
                    console.log("\n\n\n\nOra verifico quali stanno nell'area geografica");

                    //res.writeHead(200, {"Content-Type": "application/json"});
                    //res.end(JSON.stringify(results));


                    //PARTE NUOVA

                    let result = Object.values(JSON.parse(JSON.stringify(results)));

                    var objectReversed = result.reverse();

                    var ids = objectReversed.map(item => item["resource_id"]);

                    const setIDs = [...new Set(ids)];

                    let object = new Map();

                    setIDs.forEach(id => {
                        var objWithCurrentID = objectReversed.filter(obj => obj["resource_id"] === id);
                        object.set(id, objWithCurrentID);
                    });

                    var arr = {};

                    object.forEach((value, key) => {
                        arr[key] = {};
                        value.forEach(property => {

                            var propertyObject = {};
                            var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                            propertyObject[propertyName] = property;

                            if (arr[key][propertyName] === undefined) {
                                arr[key][propertyName] = [property];
                            } else {
                                arr[key][propertyName].push(property);
                            }
                        });

                        object.set(key, arr[key]);
                    });

                    object.forEach((value, key) => {
                        for (let k in value) {
                            value[k].forEach(prop => {
                                if (prop.value_resource_id !== null) {
                                    if (prop.value === undefined || prop.value === null) {
                                        prop.value = [];
                                        prop.value.push(object.get(prop.value_resource_id));
                                    } else {
                                        prop.value.push(object.get(prop.value_resource_id));
                                    }
                                }
                            });
                        }
                    });

                    var objectListFinal = [];

                    list.forEach(id => {
                        objectListFinal.push(object.get(id));
                    })

                    console.log("\n\n\nobjectListFinal");
                    console.log(objectListFinal);
                    ///

                    var locus = objectListFinal;
                    const locusIDsResults = await getLocusInRegionIDs(locus, null, body.placeGeoJSON, null, "Search Locus");
                    console.log("\n\n\n\nHO OTTENUTI I LOCUS CHE STANNO NELLA REGIONE GEOGRAFICA");
                    console.log(locusIDsResults);

                    var locusObjectsResult = [];
                    locus.forEach(loc => {
                        console.log("loc[\"dcterms:title\"][0][\"resource_id\"]: " + loc["dcterms:title"][0]["resource_id"]);
                        if (locusIDsResults.locusInRegionIDs.includes(loc["dcterms:title"][0]["resource_id"])) {
                            locusObjectsResult.push(loc);
                        }
                    });

                    console.log("\n\n\nlocusObjectsResult");
                    console.log(locusObjectsResult);

                    //Ordino in ordine alfabetico
                    locusObjectsResult.sort((a, b) => {
                        const titleA = a['dcterms:title'][0]['value'].split(':')[1].trim();
                        const titleB = b['dcterms:title'][0]['value'].split(':')[1].trim();

                        // Usa localeCompare per ordinare in base al titolo (ignorando maiuscole/minuscole)
                        return titleA.localeCompare(titleB);
                    });

                    //res.writeHead(200, {"Content-Type": "application/json"});
                    res.json(locusObjectsResult);

                }
            }

            executeBatchQueries(queries);
        }


        //res.writeHead(200, {"Content-Type": "application/json"});
        //res.end(JSON.stringify(filmIntersection));
    });
}

function intersection(array1, array2) {
    return array1.filter(value => array2.includes(value));
}


async function searchFilm(res, req, filters = null) {

    console.log("\n\n\nSONO IN SEARCH FILMS");
    console.log(filters);

    var body;
    if (filters !== null) {
        body = filters;
    } else {
        body = JSON.parse(JSON.stringify(req.body));
    }
    //body = JSON.parse(JSON.stringify(req.body));

    console.log("OBJECT FILTERS");
    console.log(body);

    if (areAllFiltersEmpty(body)) {
        console.log("Tutte le chiavi dell'oggetto sono vuote.");

        //se ho filters allora non devo tornare i film come oggetti, ma solo tutti gli id, quindi devo implementare una query che ritorni tutti gli id di film e chiamarla
        if (filters === null) {
            console.log("CHIAMO getAllFilmsDB");
            getAllFilmsHomepageDB(res);
        } else {
            console.log("CHIAMO getAllFilmsIDsDB");
            return getAllFilmsIDsDB(res);
        }
    } else {
        console.log("Almeno una chiave dell'oggetto non è vuota.");
        var con = mysql.createConnection({
            host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
        });

        var query_parts = [false, false, false, false, false, false, false, false, false, false, false, false];
        var query = `SELECT DISTINCT * FROM (\n`;

        if (functions.checkTitle(body)) {
            console.log("CHECK TITLE E' TRUE");
            query += functions.composeTitle(body);
            query_parts[0] = true;
        }


        if (functions.checkDirector(body)) {
            if (functions.checkForTrueUpToIndex(query_parts, 1)) {
                query += "\nINTERSECT\n";
            }

            query += functions.composeDirector(body);
            query_parts[1] = true;
        }

        if (functions.checkSubject(body)) {
            if (functions.checkForTrueUpToIndex(query_parts, 2)) {
                query += "\nINTERSECT\n";
            }

            query += functions.composeSubject(body);
            query_parts[2] = true;
        }

        if (functions.checkScreenwriter(body)) {
            if (functions.checkForTrueUpToIndex(query_parts, 3)) {
                query += "\nINTERSECT\n";
            }

            query += functions.composeScreenwriter(body);
            query_parts[3] = true;
        }

        if (functions.checkCredits(body)) {
            if (functions.checkForTrueUpToIndex(query_parts, 4)) {
                query += "\nINTERSECT\n";
            }

            query += functions.composeCredits(body);
            query_parts[4] = true;
        }

        if (functions.checkProductionName(body)) {
            if (functions.checkForTrueUpToIndex(query_parts, 5)) {
                query += "\nINTERSECT\n";
            }

            query += functions.composeProductionName(body);
            query_parts[5] = true;
        }

        console.log("TOCCA AI GENERI");
        if (functions.checkGenres(body)) {
            if (functions.checkForTrueUpToIndex(query_parts, 6)) {
                query += "\nINTERSECT\n";
            }

            query += functions.composeGenres(body);
            query_parts[6] = true;
        }

        if (functions.checkProductionCountry(body)) {
            if (functions.checkForTrueUpToIndex(query_parts, 7)) {
                query += "\nINTERSECT\n";
            }

            query += functions.composeProductionCountry(body);
            query_parts[7] = true;
        }

        if (functions.checkSynopsis(body)) {
            if (functions.checkForTrueUpToIndex(query_parts, 8)) {
                query += "\nINTERSECT\n";
            }

            query += functions.composeSynopsis(body);
            query_parts[8] = true;
        }

        if (functions.checkStyle(body)) {
            if (functions.checkForTrueUpToIndex(query_parts, 9)) {
                query += "\nINTERSECT\n";
            }

            query += functions.composeStyle(body);
            query_parts[9] = true;
        }

        if (functions.checkDate(body)) {
            if (functions.checkForTrueUpToIndex(query_parts, 10)) {
                query += "\nINTERSECT\n";
            }

            query += functions.composeDate(body);
            query_parts[10] = true;
        }

        if (functions.checkCastMember(body)) {
            if (functions.checkForTrueUpToIndex(query_parts, 11)) {
                query += "\nINTERSECT\n";
            }

            query += functions.composeCastMember(body);
            query_parts[11] = true;
        }

        query += '\n) AS films';

        console.log("query_parts");
        console.log(query_parts)
        console.log("\n\n\n\nQUERY FINALE FILMS\n");
        console.log(query);


        //TODO: implementare le ue query

        let idsFilms = new Promise((resolve, reject) => {
            con.query(query, (err, rows) => {
                // console.log(rows);
                if (err) {
                    return reject(err);
                } else {
                    let list = Object.values(JSON.parse(JSON.stringify(rows)));

                    resolve({list, res});
                }
            });
        });

        //chiedo tutti i dati dei film
        idsFilms = idsFilms.then(function ({list, res}) {
            console.log("RES NEL THEN");
            console.log(list);

            list = list.map(film => film.resource_id);
            console.log("LISTA IDDDDDD");
            console.log(list);

            // list = list.slice(0, 2);

            if (filters === null) {

                if (list.length > 0) {

                    var query = `
                                WITH RECURSIVE test as ( 
                                    SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
                                    FROM value as v1 
                                    WHERE v1.resource_id=${list.join(" OR v1.resource_id=")
                                                }
                                UNION
                                (
                                  SELECT
                                    v2.resource_id,
                                    v2.property_id,
                                    v2.value_resource_id,
                                    v2.value,
                                    v2.uri
                                  FROM
                                    value as v2
                                    INNER JOIN test ON test.value_resource_id = v2.resource_id
                                )
                              )
                              select
                                test.resource_id,
                                test.property_id,
                                test.value_resource_id,
                                test.value,
                                property.local_name as property_name,
                                property.label as property_label,
                                vocabulary.prefix as vocabulary_prefix,
                                r2.local_name,
                                r2.label,
                                m.storage_id as media_link,
                                test.uri as uri_link
                              from
                                test
                                join property on test.property_id = property.id
                                join vocabulary on property.vocabulary_id = vocabulary.id
                                join resource as r1 on test.resource_id = r1.id
                                join resource_class as r2 on r1.resource_class_id = r2.id
                                left join media as m on test.resource_id = m.item_id
                                where property.local_name IN ("title", "hasImageData", "caption", "genre", "hasTypologyData", "hasDirectorData", "directorName");
                                      `;

                    makeInnerQuery(con, res, query, list);

                } else {
                    //res.writeHead(200, {"Content-Type": "application/json"});
                    res.json([]);

                    con.end();
                }

            } else {

                con.end();
                console.log("La connessione è stata chiusa");

                console.log("Sono stao chiamato da 'get_rappr_luogo', ritorno la lista");
                return list;
            }

        });

        return idsFilms.then(result => {
            console.log("EIEIEI ECCOMI");
            if (Array.isArray(result)) {
                // Se il risultato è un array (ovvero la lista), restituiscilo
                return result;
            } else {
                // Se il risultato non è un array, non c'è una lista da restituire
                return [];
            }
        });
    }
}

async function getFilmsOfLocusByLocusID(res, req, filters = null, returnToClient = true) {
    var body;
    if (filters !== null) {
        body = filters;
    } else {
        body = JSON.parse(JSON.stringify(req.body));
    }

    console.log("OBJECT FILTERS");
    console.log(body);

    if (!body.locus_id) {
        console.log("ERROR: missing locus id");

        if (returnToClient) {
            //res.writeHead(200, {"Content-Type": "application/json"});
            res.json([]);
        } else {
            return [];
        }
    } else {
        console.log("Locus ID present");
        var con = mysql.createConnection({
            host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
        });

        var query = `SELECT Lista_id_connessi from LocusRelationships WHERE ID=${body.locus_id};`;

        async function executeBatchQueries(queries) {
            return new Promise((resolve, reject) => {
                var results = [];
                var index = 0;

                function executeNextQuery() {
                    if (index < queries.length) {
                        const query = queries[index];
                        con.query(query, (error, queryResults) => {
                            if (error) {
                                con.rollback(() => {
                                    console.error('Errore nell\'esecuzione della query:', error);
                                    con.end();
                                    reject(error);
                                });
                            } else {
                                console.log('Query eseguita con successo:', query);
                                if (index === 2) {
                                    console.log('Risultati della terza query:', queryResults);
                                    results = queryResults;
                                }
                                index++;
                                executeNextQuery(); // Chiamata ricorsiva per la prossima query
                            }
                        });
                    } else {
                        // Tutte le query sono state eseguite, risolvi la Promise con i risultati
                        resolve(results);
                    }
                }

                executeNextQuery(); // Avvia la catena di esecuzione delle query
            });
        }

        // ... Il resto del tuo codice rimane invariato

        async function executeQueries() {
            try {
                const locusList = await new Promise((resolve, reject) => {
                    con.query(query, (err, rows) => {
                        if (err) {
                            return reject(err);
                        } else {
                            let list = Object.values(JSON.parse(JSON.stringify(rows)));
                            resolve({list, res});
                        }
                    });
                });

                var {list} = locusList;
                list = list[0]["Lista_id_connessi"];
                console.log("locusList e list");
                console.log(locusList);
                console.log(list);

                const queries = [`START TRANSACTION`,

                    `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
                    SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id
                    FROM value v
                    JOIN property p ON v.property_id = p.id;`,

                    `SELECT distinct av.value_resource_id as film_resource_id
                        FROM tabella_unica rl1
                        JOIN tabella_unica uc ON rl1.value_resource_id = uc.resource_id
                        JOIN tabella_unica av ON uc.value_resource_id = av.resource_id
                        WHERE rl1.local_name = 'hasLinkedFilmUnitCatalogueRecord'
                        AND uc.local_name = 'hasLinkedFilmCopyCatalogueRecord'
                        AND av.local_name = 'hasLinkedFilmCatalogueRecord'
                        AND rl1.resource_id IN (
                            SELECT t1.resource_id
                        FROM tabella_unica t1
                        JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
                        JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                        WHERE (t3.value_resource_id IN (${list}) AND t2.local_name = 'hasSinglePlaceRepresentationData'
                        AND t3.local_name IN ('placeRepresentationHasDisplayedObject', 'placeRepresentationHasRepresentedNarrativePlace'))
                    OR (t2.value_resource_id IN (${list}) AND t2.local_name = 'placeRepresentationHasCameraPlacement')
                    OR (t2.value_resource_id IN (${list}) AND t2.local_name = 'placeRepresentationHasContextualNarrativePlace')
                );`,

                    `DROP TEMPORARY TABLE tabella_unica;`,

                    `COMMIT;`, // Aggiungi altre query qui
                ];

                const results = await executeBatchQueries(queries);

                console.log("Risultati dopo l'esecuzione di tutte le query:", results);

                var filmInLocus = [];
                if (returnToClient) {
                    console.log("DEVO TORNARE I FILM AL CLIENT");
                    if (results.length > 0) {
                        console.log("chiedo i film per mandarli al client");
                        filmInLocus = getFilmsOfLocus(results.map(obj => obj.film_resource_id), con, res, filters);
                    } else {
                        con.end();
                        //res.writeHead(200, {"Content-Type": "application/json"});
                        res.json([]);
                    }
                } else {
                    con.end();
                    console.log("ritorno list a searchFilmWrapper - returnToClient è false");
                    if (results.length > 0) {
                        return results.map(obj => obj.film_resource_id);
                    } else {
                        return [];
                    }
                }

            } catch (error) {
                console.error("Errore durante l'esecuzione delle query:", error);
                return [];
            }
        }

        // Chiamare la funzione principale
        return executeQueries().then(result => {
            // Fai qualcosa con il risultato
            console.log("executeQueries().then");
            console.log(result);
            return result;
        });
    }
}

//TODO: implementare funzione che restituisce i luoghi a partire dal film
function getLocusOfFilmByFilmID(res, req) {
    var body = JSON.parse(JSON.stringify(req.body));

    console.log("OBJECT FILTERS");
    console.log(body);

    if (!body.film_id) {
        console.log("ERROR: missing film id");
        //res.writeHead(200, {"Content-Type": "application/json"});
        res.json([]);
    } else {
        console.log("Film ID present");
        var con = mysql.createConnection({
            host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
        });


        const queries = [`START TRANSACTION`,

            `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
            SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id
            FROM value v
            JOIN property p ON v.property_id = p.id;`,

            `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_rappresentazioni_luogo_film AS
            SELECT * FROM (
                SELECT v2.resource_id
                FROM (
                    SELECT v1.resource_id
                    FROM (
                        SELECT v.resource_id
                        FROM \`value\` v
                        JOIN property p ON v.property_id = p.id
                        WHERE p.local_name = "hasLinkedFilmCatalogueRecord"
                        AND v.value_resource_id = ${body.film_id}
                    ) as copie_film
                    JOIN value v1 ON copie_film.resource_id = v1.value_resource_id
                    JOIN property p ON v1.property_id = p.id
                    WHERE p.local_name = "hasLinkedFilmCopyCatalogueRecord"
                ) as uc
                JOIN value v2 ON uc.resource_id = v2.value_resource_id
                JOIN property p ON v2.property_id = p.id
                WHERE p.local_name = "hasLinkedFilmUnitCatalogueRecord"
            ) as rappresentazione_luogo;`,

            `SELECT * FROM (
                SELECT value_resource_id
                FROM (
                    SELECT * FROM (
                        SELECT value_resource_id as luoghi_resource_id
                        FROM tabella_unica
                        WHERE local_name = "hasPlacesData"
                        AND resource_id IN (SELECT * FROM tabella_rappresentazioni_luogo_film)
                    ) as luoghi_property
                    JOIN tabella_unica ON luoghi_property.luoghi_resource_id = tabella_unica.resource_id
                    WHERE local_name = "placeRepresentationHasCameraPlacement"
                ) as luoghi_posizionamento_camera
            
                UNION
            
                SELECT value_resource_id as locus_resource_id
                FROM (
                    SELECT * FROM (
                        SELECT value_resource_id as dettaglio_resource_id
                        FROM (
                            SELECT * FROM (
                                SELECT value_resource_id as luoghi_resource_id
                                FROM tabella_unica
                                WHERE local_name = "hasPlacesData"
                                AND resource_id IN (SELECT * FROM tabella_rappresentazioni_luogo_film)
                            ) as luoghi_property
                            JOIN tabella_unica ON luoghi_property.luoghi_resource_id = tabella_unica.resource_id
                            WHERE local_name = "hasSinglePlaceRepresentationData"
                        ) as luoghi_posizionamento_camera
                    ) as dettagli_luoghhi
                    JOIN tabella_unica ON dettagli_luoghhi.dettaglio_resource_id = tabella_unica.resource_id
                    WHERE local_name = "placeRepresentationHasDisplayedObject"
                    OR local_name = "placeRepresentationHasRepresentedNarrativePlace"
                ) as locus
            
                UNION
            
                SELECT value_resource_id
                FROM (
                    SELECT * FROM (
                        SELECT value_resource_id as contesto_resource_id
                        FROM tabella_unica
                        WHERE local_name = "hasContextualElementsData"
                        AND resource_id IN (SELECT * FROM tabella_rappresentazioni_luogo_film)
                    ) as elementi_contestuali
                    JOIN tabella_unica ON elementi_contestuali.contesto_resource_id = tabella_unica.resource_id
                    WHERE local_name = "placeRepresentationHasContextualNarrativePlace"
                ) as luoghi_narrativi
            ) as luoghi_nel_rappresentazione_luogo JOIN value on luoghi_nel_rappresentazione_luogo.value_resource_id = value.resource_id where property_id = 1;`,

            `DROP TEMPORARY TABLE tabella_unica;`,

            `DROP TEMPORARY TABLE tabella_rappresentazioni_luogo_film;`,

            `COMMIT;`, // Aggiungi altre query qui
        ];

        //TODO: manca "linguaggio e stile come false"

        var results = []; // Array per salvare i risultati della terza query

        function executeBatchQueries(queries, index = 0) {
            if (index < queries.length) {
                const query = queries[index];
                con.query(query, (error, queryResults) => {
                    if (error) {
                        con.rollback(() => {
                            console.error('Errore nell\'esecuzione della query:', error);
                            con.end();
                        });
                    } else {
                        console.log('Query eseguita con successo:', query);
                        if (index === 3) { // Verifica se questa è la terza query (l'indice 2)
                            console.log('Risultati della terza query:', queryResults);
                            results = queryResults;
                        }
                    }
                    executeBatchQueries(queries, index + 1);
                });
            } else {
                // Chiudi la connessione quando tutte le query sono state eseguite
                con.end();
                // Restituisci i risultati della terza query al frontend
                console.log('Risultati finali da restituire al frontend:', results);

                //res.writeHead(200, {"Content-Type": "application/json"});
                res.json(results);

            }
        }

        executeBatchQueries(queries);
    }
}


function getUCofFilmWithPresentPerson(res, req) {
    console.log("BODY");
    console.log(req.body);
    var body = JSON.parse(JSON.stringify(req.body));

    console.log("OBJECT FILTERS");
    console.log(body);

    // qua dò per scontato di dover avere sia il nome interprete che il nome del personaggio
    if (!body.film_id || !body.cast_member_name || !body.character_name) {
        console.log("ERROR: missing parameter");
        //res.writeHead(200, {"Content-Type": "application/json"});
        res.json([]);
    } else {
        console.log("Parameters ok");
        var con = mysql.createConnection({
            host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
        });


        const queries = [`START TRANSACTION`,

            `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
                SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value
                FROM value v
            JOIN property p ON v.property_id = p.id;`,

            `CREATE TEMPORARY TABLE IF NOT EXISTS uc_of_film AS
            SELECT distinct uc.resource_id FROM value as f join value as fc on f.resource_id = fc.value_resource_id join value as uc on fc.resource_id = uc.value_resource_id where f.resource_id = ${body.film_id};
            `,

            `CREATE TEMPORARY TABLE IF NOT EXISTS persona_presente AS
            SELECT t1.resource_id from tabella_unica t1 join tabella_unica t2 on t1.resource_id = t2.resource_id
            where (t1.local_name = "presentPersonCharacterName" and t1.value = "${body.character_name}") and (t2.local_name = "presentPersonCastMemberName" and t2.value = "${body.cast_member_name}");
            `,

            `CREATE TEMPORARY TABLE IF NOT EXISTS rappresentazioni_luogo_con_persona_presente AS
            SELECT t1.resource_id from tabella_unica t1 join persona_presente p1 on t1.value_resource_id = p1.resource_id;`,

            `CREATE TEMPORARY TABLE IF NOT EXISTS uc_con_persona_presente AS
            SELECT t1.value_resource_id from tabella_unica t1 join rappresentazioni_luogo_con_persona_presente r1 on t1.resource_id = r1.resource_id where t1.local_name = "hasLinkedFilmUnitCatalogueRecord";
            `,


            `SELECT * FROM (
            SELECT * from uc_con_persona_presente
                     INTERSECT
            SELECT * from uc_of_film ) AS uc join tabella_unica t1 on uc.value_resource_id = t1.resource_id where t1.property_id = 1 or (t1.local_name = "description" and t1.property_id <> 4);
            `,


            `DROP TEMPORARY TABLE uc_of_film;`,

            `DROP TEMPORARY TABLE uc_con_persona_presente;`,

            `DROP TEMPORARY TABLE rappresentazioni_luogo_con_persona_presente;`, `DROP TEMPORARY TABLE persona_presente;`, `DROP TEMPORARY TABLE tabella_unica;`,

            `COMMIT;`, // Aggiungi altre query qui
        ];

        //TODO: manca "linguaggio e stile come false"

        var results = []; // Array per salvare i risultati della terza query

        function executeBatchQueries(queries, index = 0) {
            if (index < queries.length) {
                const query = queries[index];
                con.query(query, (error, queryResults) => {
                    if (error) {
                        con.rollback(() => {
                            console.error('Errore nell\'esecuzione della query:', error);
                            con.end();
                        });
                    } else {
                        console.log('Query eseguita con successo:', query);
                        if (index === 6) { // Verifica se questa è la terza query (l'indice 2)
                            console.log('Risultati della terza query:', queryResults);

                            const combinedData = queryResults.reduce((acc, obj) => {
                                const existingObj = acc.find(item => item.resource_id === obj.resource_id);
                                if (existingObj) {
                                    existingObj[obj.local_name] = obj.value;
                                } else {
                                    const newObj = {
                                        resource_id: obj.resource_id, [obj.local_name]: obj.value
                                    };
                                    acc.push(newObj);
                                }
                                return acc;
                            }, []);

                            console.log(combinedData);

                            results = combinedData;
                        }
                    }
                    executeBatchQueries(queries, index + 1);
                });
            } else {
                // Chiudi la connessione quando tutte le query sono state eseguite
                con.end();
                // Restituisci i risultati della terza query al frontend
                console.log('Risultati finali da restituire al frontend:', results);

                //res.writeHead(200, {"Content-Type": "application/json"});
                res.json(results);

            }
        }

        executeBatchQueries(queries);
    }
}

function areAllFiltersEmpty(obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (key === "advancedSearch" || key === "locus" || obj[key] === "" || obj[key] === null || (Array.isArray(obj[key]) && obj[key].length === 0)) {
                continue;
            } else {
                console.log("CHIAVE NON VUOTA");
                console.log(key);
                console.log(obj[key]);
                return false;
            }
        }
    }
    return true;
}


async function getRapprLuogoFilmFilters(res, req, filters = null) {
    return new Promise((resolve, reject) => {
        console.log("\n\n\nSONO IN RAPPR LUOGO");
        console.log(filters);
        var body;

        var locusPromise = new Promise(async (resolve, reject) => {
            console.log("CHIEDO I LUOGHI PER POI CALCOLARE LE RAPPR LUOGO");
            var l = await getAllLocusWithMapInfoDB(res, false);
            //console.log(l);
            resolve(l);
        });

        locusPromise.then(async (locus) => {
            // Gestisci i risultati ottenuti
            //console.log('LOCUS Risultati ottenuti:', locus);
            // Esegui qui le operazioni desiderate con i risultati

            if (filters !== null) {
                body = filters;
            } else {
                body = JSON.parse(JSON.stringify(req.body));
            }

            //console.log("OBJECT FILTERS");
            //console.log(body);


            var cameraPlacementLocusInRegionIDs = [];
            var narrativeLocusInRegionIDs = [];

            var cameraFilterRegionNotFilled = false;
            var narrativeFilterRegionNotFilled = false;

            const cameraResult = await getLocusInRegionIDs(locus, body.luogoDiRipresaDrawnAreaGeoJSON, body.luogoDiRipresaRealPlacePolygon, body.luogodiRipresaSchedaLocusName, "CAMERA PLACEMENT");
            cameraPlacementLocusInRegionIDs = cameraResult.locusInRegionIDs;
            cameraFilterRegionNotFilled = cameraResult.filterRegionNotFilled;

            const narrativeResult = await getLocusInRegionIDs(locus, body.luogoNarrativoDrawnAreaGeoJSON, body.luogoNarrativoRealPlacePolygon, body.luogoNarrativoSchedaLocusName, "NARRATIVE");
            narrativeLocusInRegionIDs = narrativeResult.locusInRegionIDs;
            narrativeFilterRegionNotFilled = narrativeResult.filterRegionNotFilled;

            console.log("cameraPlacementLocusInRegionIDs");
            console.log(cameraPlacementLocusInRegionIDs);
            console.log("narrativeLocusInRegionIDs");
            console.log(narrativeLocusInRegionIDs);

            if (cameraPlacementLocusInRegionIDs.length === 0 || narrativeLocusInRegionIDs.length === 0) {
                console.log("NESSUN LUOGO TROVATO");
                resolve([]);
            } else {

                //var query = locusFunctions.composeLocusQuery(body, cameraPlacementLocusInRegionIDs, narrativeLocusInRegionIDs);

                //console.log("QUERY");
                //console.log(query);

                var con = mysql.createConnection({
                    host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
                });

                var queries = [`START TRANSACTION`,

                    `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
                    SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value
                    FROM value v
                     JOIN property p ON v.property_id = p.id;`, // Aggiungi altre query qui
                ];

                //Qua devo aggiungere le query intermedie

                if (cameraPlacementLocusInRegionIDs.length > 0) {
                    queries = locusFunctions.composeLocusRelationships(queries, cameraPlacementLocusInRegionIDs, body.cameraPlacementPlaceType, "camera", locusRelationshipsDictionary);
                    queries = locusFunctions.composeLocusOverTime(queries, cameraPlacementLocusInRegionIDs, body.cameraPlacementPlaceType, "camera", locusOverTimeRelationshipsDictionary);
                }

                if (narrativeLocusInRegionIDs.length > 0) {
                    queries = locusFunctions.composeLocusRelationships(queries, narrativeLocusInRegionIDs, body.narrativeLocusPlaceType, "narrative", locusRelationshipsDictionary);
                    queries = locusFunctions.composeLocusOverTime(queries, narrativeLocusInRegionIDs, body.narrativeLocusPlaceType, "narrative", locusOverTimeRelationshipsDictionary);
                }

                //Aggiungere query di select

                var q = locusFunctions.composeLocusQuery(body, cameraPlacementLocusInRegionIDs, narrativeLocusInRegionIDs, cameraFilterRegionNotFilled, narrativeFilterRegionNotFilled);

                console.log("STAMPO Q!!!");
                console.log(q);

                queries.push(q);
                queries.push(`SELECT t.resource_id as id_rappr_luogo, t1.resource_id as id_unita_catalografica, t2.resource_id as id_copia_film, t2.value_resource_id as id_film FROM rappr_luogo JOIN tabella_unica t ON rappr_luogo.resource_id = t.resource_id JOIN tabella_unica t1 ON t.value_resource_id = t1.resource_id JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id WHERE t.local_name = "hasLinkedFilmUnitCatalogueRecord" AND t1.local_name = "hasLinkedFilmCopyCatalogueRecord" AND t2.local_name = "hasLinkedFilmCatalogueRecord";;`);

                /*

                `DROP TEMPORARY TABLE IF EXISTS camera_locus_list_free_type;`,
                            `DROP TEMPORARY TABLE IF EXISTS camera_locus_relationships_free_type;`,
                            `DROP TEMPORARY TABLE IF EXISTS camera_locus_list_type_name;`,
                            `DROP TEMPORARY TABLE IF EXISTS camera_locus_relationships_type_name;`,
                            `DROP TEMPORARY TABLE IF EXISTS camera_locus_over_time_list_free_type;`,
                            `DROP TEMPORARY TABLE IF EXISTS camera_locus_over_time_free_type;`,
                            `DROP TEMPORARY TABLE IF EXISTS camera_locus_over_time_list_type_name;`,
                            `DROP TEMPORARY TABLE IF EXISTS camera_locus_over_time_type_name;`,

                            `DROP TEMPORARY TABLE IF EXISTS narrative_locus_list_free_type;`,
                            `DROP TEMPORARY TABLE IF EXISTS narrative_locus_relationships_free_type;`,
                            `DROP TEMPORARY TABLE IF EXISTS narrative_locus_list_type_name;`,
                            `DROP TEMPORARY TABLE IF EXISTS narrative_locus_relationships_type_name;`,
                            `DROP TEMPORARY TABLE IF EXISTS narrative_locus_over_time_list_free_type;`,
                            `DROP TEMPORARY TABLE IF EXISTS narrative_locus_over_time_free_type;`,
                            `DROP TEMPORARY TABLE IF EXISTS narrative_locus_over_time_list_type_name;`,
                            `DROP TEMPORARY TABLE IF EXISTS narrative_locus_over_time_type_name;`,

                            `DROP TEMPORARY TABLE IF EXISTS tabella_unica;`,
                 */
                queries.push(`COMMIT;`);

                var indexResults = queries.length - 2;


                console.log("\n\n\n\n\n\nARRAY DI QUERIES");
                queries.forEach(q => {
                    console.log(q);
                    console.log("\n");
                })
                console.log("\n\n\n\n\n\n");


                var promise = new Promise((resolve, reject) => {

                    var results = []; // Array per salvare i risultati della terza query

                    function executeBatchQueries(queries, index = 0) {
                        if (index < queries.length) {
                            const query = queries[index];
                            con.query(query, (error, queryResults) => {
                                console.log("\n\n\nORA ESEGUO LA SEGUENTE QUERY: \n\n\n");
                                console.log(query);
                                if (error) {
                                    con.rollback(() => {
                                        console.log("STO ESEGUENDO LA SEGUENTE QUERY: \n\n\n");
                                        console.log(query);

                                        console.log("\n\n\n");
                                        console.error('Errore nell\'esecuzione della query:', error);
                                        con.end();
                                    });
                                } else {
                                    console.log('Query eseguita con successo:', query);
                                    if (index === indexResults) { // Verifica se questa è la terza query (l'indice 2)
                                        console.log('Risultati della terza query:', queryResults);


                                        //results = {locusType: locusType, locusTypeName: locusTypeName, otherEntitiesType: otherEntitiesType, otherEntitiesTypeName: otherEntitiesTypeName, season: season, weather: weather, partOfDay: partOfDay};
                                        results = queryResults;
                                    }
                                }
                                executeBatchQueries(queries, index + 1);
                            });
                        } else {
                            // Chiudi la connessione quando tutte le query sono state eseguite
                            con.end();
                            // Restituisci i risultati della terza query al frontend
                            console.log('Risultati finali da restituire al frontend:', results);

                            if (filters === null) {
                                //res.writeHead(200, {"Content-Type": "application/json"});
                                res.json(results);
                            } else {
                                console.log("Torno i risultati alla promessa");
                                resolve(results);
                            }


                        }
                    }

                    executeBatchQueries(queries);
                });

                promise.then((results) => {
                    // Gestisci i risultati ottenuti
                    console.log('Risultati ottenuti:', results);
                    // Esegui qui le operazioni desiderate con i risultati

                    resolve(results);
                })
                    .catch((error) => {
                        // Gestisci gli errori se si verificano durante l'esecuzione di prova()
                        console.error('Errore durante l\'esecuzione di prova:', error);
                    });

            }

        });
    })
        .catch((error) => {
            // Gestisci gli errori se si verificano durante l'esecuzione di prova()
            console.error('Errore durante l\'esecuzione di prova:', error);
        });


}

async function getLocusInRegionIDs(locus, drawnAreaGeoJSON, realPlacePolygon, schedaLocusName, type) {
    var locusInRegion = [];
    var locusInRegionIDs = [];
    var noLocusInRegionNarrative = false;
    var filterRegionNotFilled = false;
    if ((drawnAreaGeoJSON !== "" && drawnAreaGeoJSON !== null) || (realPlacePolygon !== "" && realPlacePolygon !== null)) {
        console.log("CALCOLO I LUOGHI");
        /*console.log("drawnAreaGeoJSON");
        console.log(drawnAreaGeoJSON);

        console.log("store.filmFilters.luogoNarrativo.realPlaceGeoJSON");
        console.log(realPlacePolygon);

         */

        var geojsonObject = null;
        if (drawnAreaGeoJSON !== "" && drawnAreaGeoJSON !== null) {
            //TODO: implement
            //console.log("GEOJSON luogo disegnato a mano");
            //console.log(drawnAreaGeoJSON);
            geojsonObject = drawnAreaGeoJSON;
        } else if (realPlacePolygon !== "" && realPlacePolygon !== null) {
            geojsonObject = JSON.parse(realPlacePolygon);
        }

        console.log("PRENDO I LOCUS");

        /*
        console.log("PRENDO I LOCUS");
        console.log(locus);

        console.log("geojsonObject");
        console.log(geojsonObject);


        console.log("\n\n\n\nFACCIO I LUOGHI NARRATIVI");*/
        for (const loc of locus) {
            //console.log("\n\n\n\nNUOVO LOCUS");
            if (loc["filocro:hasMapReferenceData"]) {
                //console.log("primo if");
                if (loc["filocro:hasMapReferenceData"][0]["value"][0]["filocro:mapReferenceTextualData"]) {
                    //console.log("secondo if");
                    if (loc["filocro:hasMapReferenceData"][0]["value"][0]["filocro:mapReferenceTextualData"][0]["value"]) {
                        //console.log("terzo if");
                        var json = loc["filocro:hasMapReferenceData"][0]["value"][0]["filocro:mapReferenceTextualData"][0]["value"];
                        var jsonObject = "";
                        var currentLocusGeoJSON = {};

                        //console.log(`${type} - CONTROLLO IL LOCUS: ` + loc["dcterms:title"][0]["resource_id"]);
                        //console.log(json);


                        try {
                            //console.log("SOSTITUISCO");
                            //console.log(json.replace(/\/'/g, '\"'));
                            jsonObject = JSON.parse(json.replace(/\/'/g, '\"'));
                            //console.log("1 - JSON OBJECT");
                            //console.log(jsonObject);
                        } catch (err) {
                            //console.log("ERRORE NEL PRIMO TRY")
                            //console.log(err);

                            try {
                                //console.log("SOSTITUISCO NEL SECONDO TRY");
                                //console.log(json.replace(/'/g, '\"'));
                                jsonObject = JSON.parse(json.replace(/'/g, '\"'));
                                //console.log("2 - JSON OBJECT");
                                //console.log(jsonObject);
                            } catch (err) {
                                //console.log("ERRORE NEL SECONDO TRY")
                                //console.log(err);

                                continue;

                                // Pattern per trovare i valori di 'osm_type' e 'osm_id'
                                const patternOsmType = /\/'osm_type\/': \/\'([^']*)\/\'/;
                                const patternOsmId = /\/'osm_id\/': ([0-9]+)/;

                                // Trova i valori usando le espressioni regolari
                                const matchOsmType = json.match(patternOsmType);
                                const matchOsmId = json.match(patternOsmId);

                                /*console.log("matchOsmType");
                                console.log(matchOsmType[1]);
                                console.log("matchOsmId");
                                console.log(matchOsmId[1]);

                                 */

                                var type = "";
                                if (matchOsmType[1] === "relation") {
                                    type = "rel";
                                } else if (matchOsmType[1] === "way") {
                                    type = "way";
                                } else if (matchOsmType[1] === "node") {
                                    type = "node";
                                }

                                var overpassQuery = `
                                  [out:json];${type}(${matchOsmId[1]}); out geom;
                                `;

                                //console.log("OVERPASS QUERY");
                                //console.log(overpassQuery);

                                var response = await getGeoJSON_OSM(overpassQuery);//await axios.post('https://overpass-api.de/api/interpreter', overpassQuery);

                                if (response === null) {
                                    // Passa al ciclo successivo se la risposta è null (timeout)
                                    console.log('Passa al prossimo ciclo...');
                                    continue;
                                }

                                const geojsonTEST = osmtogeojson(response.data);

                                currentLocusGeoJSON = geojsonTEST.features.find(f => f.id.includes(matchOsmId[1]));

                                //console.log("currentLocusGeoJSON");
                                //console.log(currentLocusGeoJSON);
                            }
                        }


                        /*
                        console.log("JSON OBJECT");
                        console.log(jsonObject);

                        console.log("currentLocusGeoJSON");
                        console.log(JSON.stringify(currentLocusGeoJSON));

                         */

                        if (JSON.stringify(currentLocusGeoJSON) === "{}") {
                            //console.log("narrative - currentLocusGeoJSON è vuoto");
                            if (jsonObject.gjFeaturePoly === undefined || jsonObject.gjFeaturePoly === null) {
                                const boundingbox = jsonObject.boundingbox.map(parseFloat); // Converte le stringhe in numeri

                                var bbox = [boundingbox[0], boundingbox[2], boundingbox[1], boundingbox[3]];

                                //console.log("BBOX");
                                //console.log(bbox);

                                // Estrai le coordinate dalla bounding box
                                const minLon = bbox[1];
                                const minLat = bbox[0];
                                const maxLon = bbox[3];
                                const maxLat = bbox[2];

                                currentLocusGeoJSON = {
                                    type: 'Feature',
                                    geometry: {
                                        type: 'Polygon',
                                        coordinates: [
                                            [
                                                [minLon, minLat],
                                                [maxLon, minLat],
                                                [maxLon, maxLat],
                                                [minLon, maxLat],
                                                [minLon, minLat] // chiudi il poligono
                                            ]
                                        ]
                                    },
                                    properties: {}
                                };
                            } else {
                                //console.log("ESISTE IL GEOJSON DI OPENSTREETMAP");
                                currentLocusGeoJSON = jsonObject.gjFeaturePoly;
                            }
                        }

                        /*
                        console.log("currentLocusGeoJSON");
                        console.log(currentLocusGeoJSON);

                        console.log("geojsonObject");
                        console.log(JSON.stringify(geojsonObject));

                        console.log("currentLocusGeoJSON");
                        console.log(JSON.stringify(currentLocusGeoJSON));

                         */

                        /*
                        //controllo se i due geojson si intersecano
                        var intersection = intersect(geojsonObject, currentLocusGeoJSON);

                        if (intersection) {
                          console.log("I due luoghi intersecano");
                          locusInRegion.push(loc);
                          locusInRegionIDs.push(loc["dcterms:title"][0]["resource_id"]);
                        } else {
                          console.log("NON INTERSECANO");
                        }*/

                        //controllo se i due geojson si intersecano
                        /*console.log("geojsonObject");
                        console.log(geojsonObject);
                        console.log("currentLocusGeoJSON");
                        console.log(currentLocusGeoJSON);*/

                        var intersection = null;

                        //console.log("currentLocusGeoJSON.geometry.type");
                        //console.log(currentLocusGeoJSON.geometry.type);

                        if (currentLocusGeoJSON.geometry.type === "Point") {
                            //console.log("Il currentLocusGeoJSON è un punto");
                            intersection = turfFunctions.booleanPointInPolygon(currentLocusGeoJSON, geojsonObject);
                            //console.log("INTERSECTION");
                            //console.log(intersection);
                        } else if (currentLocusGeoJSON.geometry.type === "LineString") {
                            //Distinguere se il geojsonObject è un polygon o un multipolygon
                            //console.log("Il currentLocusGeoJSON è una linea");

                            if (geojsonObject.geometry.type === "Polygon") {
                                //console.log("il geojsonObject è un polygon");
                                intersection = turfFunctions.booleanCrosses(currentLocusGeoJSON, geojsonObject);
                                //console.log("INTERSECTION");
                                //console.log(intersection);
                            } else if (geojsonObject.geometry.type === "MultiPolygon") {
                                //console.log("il geojsonObject è un multi-polygon");

                                var line = turfFunctions.lineString(currentLocusGeoJSON.geometry.coordinates);
                                var boundingbox = turfFunctions.bbox(line);
                                var bboxPolygon = turfFunctions.bboxPolygon(boundingbox);
                                //console.log("bboxPolygon");
                                //console.log(bboxPolygon);

                                intersection = turfFunctions.intersect(geojsonObject, bboxPolygon);

                                /*
                                var doesIntersect = false;
                                for (var i = 0; i < geojsonObject.geometry.coordinates.length; i++) {
                                  var poly = turfFunctions.polygon(geojsonObject.geometry.coordinates[i]);
                                  var line = turf.lineString(currentLocusGeoJSON.geometry.coordinates);
                                  var bbox = turf.bbox(line);
                                  var bboxPolygon = turf.bboxPolygon(bbox);
                                  console.log("bboxPolygon");
                                  console.log(bboxPolygon);
                                  console.log("LINE");
                                  console.log(currentLocusGeoJSON.geometry.coordinates);
                                  console.log(JSON.stringify(line));
                                  console.log("POLY");
                                  console.log(JSON.stringify(poly));
                                  var overlap = lineOverlap(line, poly);
                                  console.log("OVERLAP");
                                  console.log(JSON.stringify(overlap));
                                  if (overlap.features !== [] && overlap.features.length > 0) {
                                    console.log("ESISTE UN OVERLAP");
                                    doesIntersect = true;
                                    break;
                                  }
                                }

                                intersection = doesIntersect;*/
                                //console.log("INTERSECTION");
                                //console.log(intersection);
                            }

                        } else if (currentLocusGeoJSON.geometry.type === "MultiLineString") {
                            //console.log("SONO IN UNA MULTILINESTRING");

                            //console.log(JSON.stringify(currentLocusGeoJSON));
                            //console.log("\n\n\ngeojsonObject");
                            //console.log(JSON.stringify(geojsonObject));
                            var multiline = turfFunctions.multiLineString(currentLocusGeoJSON.geometry.coordinates);
                            var polygon = turf.lineStringToPolygon(multiline);

                            //console.log(polygon);

                            intersection = turfFunctions.intersect(geojsonObject, polygon);

                        } else {
                            //console.log("Non è un nessuna delle geometrie sopra");
                            intersection = turfFunctions.intersect(geojsonObject, currentLocusGeoJSON);
                            //console.log("INTERSECTION");
                            //console.log(JSON.stringify(intersection));

                            if (intersection) {
                                // Calcola l'area del poligono
                                const area = turfFunctions.area(intersection);
                                //console.log('Area del poligono:', area, 'metri quadrati');
                            }
                        }

                        var primoContieneSecondo = null;
                        const mergedCoordinatesGeoJSON = geojsonObject.geometry.coordinates.reduce((acc, coords) => {
                            // Unisci i poligoni interni per ottenere un singolo set di coordinate
                            return acc.concat(coords);
                        }, []);

                        // Crea un nuovo GeoJSON Polygon con le coordinate unite
                        const polygonGeoJSON = {
                            type: "Polygon",
                            coordinates: mergedCoordinatesGeoJSON
                        };

                        if (currentLocusGeoJSON.geometry.type === "Point") {
                            //console.log("CONTROLLO SE UN PUNTO STA IN UN POLIGONO booleanPointInPolygon!");
                            //console.log(currentLocusGeoJSON.geometry.coordinates);
                            primoContieneSecondo = turfFunctions.booleanPointInPolygon(currentLocusGeoJSON.geometry, polygonGeoJSON);
                        } else if (currentLocusGeoJSON.geometry.type === "LineString") {
                            ///console.log("CONTROLLO SE UNA LINEA STA IN UN POLIGONO!");
                            primoContieneSecondo = turfFunctions.booleanContains(polygonGeoJSON, currentLocusGeoJSON);
                        } else {

                            const mergedCoordinates = currentLocusGeoJSON.geometry.coordinates.reduce((acc, coords) => {
                                // Unisci i poligoni interni per ottenere un singolo set di coordinate
                                return acc.concat(coords);
                            }, []);

                            // Crea un nuovo GeoJSON Polygon con le coordinate unite
                            const polygon = {
                                type: "Polygon",
                                coordinates: [mergedCoordinates]
                            };

                            /*
                            console.log("GEOJSON POLYGON");
                            console.log(JSON.stringify(polygon));

                            console.log("geojsonObject");
                            console.log(JSON.stringify(polygonGeoJSON));

                             */

                            /*
                          Stringhe necessarie per capire se sto guardando lo stesso identico GEOJSON
                          In questo caso primoContieneSecondo sarà per forza true dato che sono identici e quindi non mi agigungerà il luogo alla lista
                          Supponiamo però di aver selezionato piazza san marco sulla mappa e di avere un luogo nel catalogo che ha lo stesso geojson, io voglio che questo luogo mi venga restituito!
                          Quindi controllo se i due geojson sono identici, in questo caso aggiungo il luogo alla lista
                          */

                            var mergedCoordinatesString = JSON.stringify(mergedCoordinates);
                            var mergedCoordinatesGeoJSONString = JSON.stringify(mergedCoordinatesGeoJSON);

                            /*
                            console.log("mergedCoordinatesString");
                            console.log(mergedCoordinatesString);

                            console.log("mergedCoordinatesGeoJSONString");
                            console.log(mergedCoordinatesGeoJSONString);*/

                            //primoContieneSecondo = booleanContains(polygon, geojsonObject);

                            try {
                                //console.log("entro nel try");
                                primoContieneSecondo = turfFunctions.booleanContains(polygon, polygonGeoJSON);
                            } catch (e) {
                                //console.log("entro nel catch, il try non ha funzionato");
                                //console.log(e);
                                polygonGeoJSON.coordinates = [polygonGeoJSON.coordinates]
                                primoContieneSecondo = turfFunctions.booleanContains(polygon, polygonGeoJSON);
                                //TODO: sistemare -> qua ho un errore
                                //Error: coord must be GeoJSON Point or an Array of numbers
                            }
                        }

                        // Verifica se il primo luogo contiene il secondo
                        /*console.log("intersection");
                        console.log(intersection);
                        console.log("primoContieneSecondo");
                        console.log(primoContieneSecondo);*/
                        if (intersection && !primoContieneSecondo) {
                            //console.log("I due luoghi intersecano");
                            locusInRegion.push(loc);
                            locusInRegionIDs.push(loc["dcterms:title"][0]["resource_id"]);
                        } else {
                            if (primoContieneSecondo) {
                                //console.log("NON AGGIUNGO IL LUOGO POLYGON PERCHE PRIMO CONTIENE SECONDO")

                                if (mergedCoordinatesString === mergedCoordinatesGeoJSONString) {
                                    //console.log("AGGIUNGO IL LUOGO POLYGON PERCHE SONO IDENTICI")
                                    locusInRegion.push(loc);
                                    locusInRegionIDs.push(loc["dcterms:title"][0]["resource_id"]);
                                }
                            } else {
                                //console.log("NON AGGIUNGO IL LUOGO POLYGON ");
                            }

                        }
                    }
                }
            }
        }

        /*
        console.log("NARRATIVE LOCUS IN REGION");
        console.log(locusInRegion);
        console.log(locusInRegionIDs);
        *
         */

        if (locusInRegionIDs.length === 0) {
            noLocusInRegionNarrative = true;
        }
    } else if (schedaLocusName !== '' && schedaLocusName !== null && schedaLocusName !== undefined) {
        //console.log("LUOGO SELEZIONATO DAL CATALOGO");
        //console.log(schedaLocusName);
        locusInRegionIDs.push(schedaLocusName);
    } else {
        //recupero tutti gli id dei locus
        //TODO: sto modificando qua


        locus.forEach((loc) => {
            locusInRegionIDs.push(loc["dcterms:title"][0]["resource_id"]);
        });

        filterRegionNotFilled = true;
    }

    return {locusInRegionIDs, filterRegionNotFilled};
}

async function getGeoJSON_OSM(overpassQuery) {
    try {
        const response = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery, {
            timeout: 5000, // Imposta un timeout di 5 secondi
        });
        // Se la richiesta ha avuto successo, fai qualcosa con la risposta
        console.log("RISPOSTA OTTENUTA NEL METODO getGeoJSON_OSM");
        console.log(response.data);
        return response;
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            // Gestisci il timeout qui, ad esempio, passa al ciclo successivo
            console.error('Timeout della richiesta!');
            return null; // oppure un valore che indica l'assenza di risposta
        } else {
            // Gestisci altri tipi di errori qui
            console.error('Errore durante la richiesta:', error.message);
            throw error; // Puoi scegliere di propagare l'errore
        }
    }
}


async function getRapprLuogo(res, req) {
    if (updatingRelationships) {
        res.status(403).send('Questa operazione non è al momento disponibile.');
    } else {
        cacheMiddleware(req, res, async () => {
            console.log("BODY");
            console.log(req.body);
            var body = JSON.parse(JSON.stringify(req.body));

            console.log("OBJECT FILTERS");
            console.log(body);

            console.log("\n\nFILM FILTERS");
            console.log(body.filmFilters);

            console.log("\n\nLOCUS FILTERS");
            console.log(body.locusFilters);//searchFilm(res, req, body.filmFilters),


            const [rapprLuogoFilmFilters, rapprLuogoLocusFilters] = await Promise.all([searchFilm(res, req, body.filmFilters), getRapprLuogoFilmFilters(res, req, body.locusFilters)]);

            console.log("Strutture dati ottenute");

            console.log("rapprLuogoFilmFilters");
            console.log(rapprLuogoFilmFilters);

            console.log("rapprLuogoLocusFilters");
            console.log(rapprLuogoLocusFilters);

            //contiene le rappresentazioni luogo che sono connesse ad un film che rispetta i filtri sui film

            if (rapprLuogoFilmFilters.length === 0 || rapprLuogoLocusFilters.length === 0) {
                //nessun risultato trovato con questi filtri
                res.json([]);
            } else {
                if (rapprLuogoFilmFilters.length > 0 && rapprLuogoLocusFilters.length > 0) {
                    //quale film rispetta i filtri
                    var filteredRapprLuogo = rapprLuogoLocusFilters.filter(obj => rapprLuogoFilmFilters.includes(obj.id_film));
                    console.log("filteredRapprLuogo");
                    console.log(filteredRapprLuogo);

                    var rapprLuogoIDs = filteredRapprLuogo.map(obj => obj.id_rappr_luogo);
                    console.log("rapprLuogoIDs");
                    console.log(rapprLuogoIDs);

                    if (rapprLuogoIDs.length > 0) {

                        let prom = new Promise((resolve, reject) => {
                            console.log("CHIEDO LE RISORSE");
                            var resources = getResourceFromID(rapprLuogoIDs, null);
                            resolve(resources);
                        });

                        prom.then(function (resources) {
                            console.log("HO OTTENUTO LE RISORSE!!");

                            if (!Array.isArray(resources)) {
                                //la risorsa è solo una, quindi mi creo un array con solo lei
                                resources = [resources];
                            } // altrimenti: ho già un array di rappr luogo


                            //array di rappresentazioni luogo che rispettano il range di ambientazione nel tempo
                            var rapprLuogoCorrectNarrativeTime = [];

                            //TODO: idea -> guardare separatamente le rappr luogo che rispettano il filtro di data nel luogo di ripresa e di data nel luogo narrativo

                            if (body.locusFilters.narrativeYearRange !== null && body.locusFilters.narrativeYearRange !== undefined &&
                                body.locusFilters.narrativeYearRange.fromYear.year !== 2999 && body.locusFilters.narrativeYearRange.fromYear.era !== 'a.C.' &&
                                body.locusFilters.narrativeYearRange.toYear.year !== 2999 && body.locusFilters.narrativeYearRange.toYear.era !== 'd.C.'
                            ) {
                                console.log("narrativeYearRange");
                                console.log(body.locusFilters.narrativeYearRange);


                                var fromYear = body.locusFilters.narrativeYearRange.fromYear;
                                /*if(fromYear.era === 'a.C.'){
                                    fromYear.year = -fromYear.year;
                                }*/
                                var toYear = body.locusFilters.narrativeYearRange.toYear;
                                /*if(toYear.era === 'a.C.'){
                                    toYear.year = -toYear.year;
                                }*/


                                const fromDate = convertToDate(`${fromYear.year} ${fromYear.era}`);
                                const toDate = convertToDate(`${toYear.year} ${toYear.era}`);
                                resources.forEach(rappr_luogo => {

                                    //console.log(JSON.stringify(rappr_luogo["precro:hasContextualElementsData"]));
                                    //console.log(rappr_luogo["precro:hasContextualElementsData"]);

                                    if (rappr_luogo["precro:hasContextualElementsData"]) {
                                        if (rappr_luogo["precro:hasContextualElementsData"][0]["value"][0] && rappr_luogo["precro:hasContextualElementsData"][0]["value"][0]["precro:narrativeTimeInterval"]) {
                                            var date = rappr_luogo["precro:hasContextualElementsData"][0]["value"][0]["precro:narrativeTimeInterval"][0]["value"];

                                            console.log("DATA CONTESTO NARRATIVO:");
                                            console.log(date);

                                            //TEST CON ALTRE DATE
                                            //date = "30 a.C. - 22 a.C. ca. - (Commento)"


                                            const regexString = /\b(\d{1,4}\s?(?:a\.C\.|d\.C\.)*)\s*(ca\.|)(?=(?:\s|$))/gi;

                                            const matches = date.match(regexString);

                                            if (matches) {
                                                console.log(matches);
                                                const anni = matches.filter(match => {
                                                    const parsed = parseInt(match);
                                                    return !isNaN(parsed) && parsed >= 0 && parsed <= 9999;
                                                });
                                                console.log("Anni:", anni);

                                                // TODO: se l'anno ha un ca. bisogna calcolare un range più ampio
                                                if (anni.length > 1) {
                                                    console.log("C'è un range di anni");
                                                    var fromYearString = anni[0];
                                                    var toYearString = anni[1];

                                                    console.log("Dall'anno: ", fromYearString);
                                                    console.log("All'anno: ", toYearString);

                                                    const startDate = convertDate(fromYearString);
                                                    const endDate = convertDate(toYearString);

                                                    var dates = startDate.concat(endDate);

                                                    console.log("startDate");
                                                    console.log(startDate);
                                                    console.log("endDate");
                                                    console.log(endDate);

                                                    console.log("\n\nDATE CONCATENATE IN UN'UNICO ARRAY:");
                                                    console.log(dates);

                                                    console.log("let risultato = arrayDiValori.some(checkCondition);");
                                                    let risultato = dates.some(date => checkDateInRange(date, fromDate, toDate));
                                                    console.log(risultato);

                                                    if (risultato) {
                                                        rapprLuogoCorrectNarrativeTime.push(rappr_luogo);
                                                    }

                                                } else {

                                                    console.log("C'è solo un anno");
                                                    var year = anni[0];
                                                    console.log("Anno: ", year);

                                                    const dates = convertDate(year);
                                                    let risultato = dates.some(date => checkDateInRange(date, fromDate, toDate));

                                                    console.log(risultato);

                                                    if (risultato) {
                                                        rapprLuogoCorrectNarrativeTime.push(rappr_luogo);
                                                    }


                                                }
                                            } else {
                                                console.log("Nessun match trovato.");
                                            }


                                        } else {
                                            //TODO: igonrare questa rappr luogo
                                        }
                                    } else {
                                        //TODO: igonrare questa rappr luogo
                                    }

                                });
                            } else {
                                //Nessun filtro sul periodo narrativo, quindi non tutte buone
                                console.log("Nessun filtro sul periodo narrativo, quindi non tutte buone");
                                rapprLuogoCorrectNarrativeTime = resources;
                            }

                            console.log("rapprLuogoCorrectNarrativeTime");
                            //console.log(rapprLuogoCorrectNarrativeTime);


                            //TODO: filtrare sulla base della data di ripresa

                            var rapprLuogoCameraPlacementTime = [];

                            if (body.locusFilters.cameraPlacementYearRange !== null && body.locusFilters.cameraPlacementYearRange !== undefined &&
                                body.locusFilters.cameraPlacementYearRange.fromYear.year !== 2999 && body.locusFilters.cameraPlacementYearRange.fromYear.era !== 'a.C.' &&
                                body.locusFilters.cameraPlacementYearRange.toYear.year !== 2999 && body.locusFilters.cameraPlacementYearRange.toYear.era !== 'd.C.') {
                                console.log("cameraPlacementYearRange");
                                console.log(body.locusFilters.cameraPlacementYearRange);


                                var fromYear = body.locusFilters.cameraPlacementYearRange.fromYear;
                                var toYear = body.locusFilters.cameraPlacementYearRange.toYear;

                                const fromDate = convertToDate(`${fromYear.year} ${fromYear.era}`);
                                const toDate = convertToDate(`${toYear.year} ${toYear.era}`);

                                resources.forEach(rappr_luogo => {
                                    if (rappr_luogo["precro:hasPlacesData"]) {
                                        console.log(JSON.stringify(rappr_luogo["precro:hasPlacesData"][0]["value"][0]));
                                        if (rappr_luogo["precro:hasPlacesData"][0]["value"][0] && rappr_luogo["precro:hasPlacesData"][0]["value"][0]["precro:shootingDate"]) {
                                            var date = rappr_luogo["precro:hasPlacesData"][0]["value"][0]["precro:shootingDate"][0]["value"];

                                            console.log("DATA DELLA RIPRESA:");
                                            console.log(date);

                                            const [year, month, day] = date.split('-');
                                            console.log("ANNO: ", year);

                                            const dateObject = convertToDate(`${year} d.C.`);

                                            var risultato = checkDateInRange(dateObject, fromDate, toDate);

                                            console.log("RISULTATO");
                                            console.log(risultato);

                                            if (risultato) {
                                                rapprLuogoCameraPlacementTime.push(rappr_luogo);
                                            }


                                        } else {
                                            //TODO: igonrare questa rappr luogo
                                        }
                                    } else {
                                        //TODO: igonrare questa rappr luogo
                                    }

                                });
                            } else {
                                //Nessun filtro sul periodo narrativo, quindi non tutte buone
                                console.log("rapprLuogoCameraPlacementTime - Nessun filtro sul periodo narrativo, quindi non tutte buone");
                                rapprLuogoCameraPlacementTime = resources;
                            }

                            console.log("rapprLuogoCameraPlacementTime");
                            console.log(rapprLuogoCameraPlacementTime);

                            //TODO: mantenere solo quelle che sono presenti in entrambi gli array

                            //Tengo solo le rappresentazioni luogo che rispettano entrambi i filtri sul tempo
                            var finalListRapprLuogo = [];
                            var rapprLuogoCameraPlacementTimeIDs = rapprLuogoCameraPlacementTime.map(obj => obj["dcterms:title"][0]["resource_id"]);

                            console.log("rapprLuogoCameraPlacementTimeIDs");
                            console.log(rapprLuogoCameraPlacementTimeIDs);


                            rapprLuogoCorrectNarrativeTime.forEach(rappr_luogo => {
                                if (rapprLuogoCameraPlacementTimeIDs.includes(rappr_luogo["dcterms:title"][0]["resource_id"])) {
                                    finalListRapprLuogo.push(rappr_luogo)
                                }
                            });

                            console.log("finalListRapprLuogo");
                            console.log(finalListRapprLuogo);

                            var unita_catalografiche = [];
                            finalListRapprLuogo.forEach(rappr_luogo => {
                                unita_catalografiche.push(rappr_luogo["precro:hasLinkedFilmUnitCatalogueRecord"][0]["value"][0]);
                            });

                            console.log(unita_catalografiche);


                            // Raggruppa le unità catalografiche per film
                            let catalogoFilm = {};

                            var connectedRapprLuogo = null;
                            unita_catalografiche.forEach(unita => {
                                connectedRapprLuogo = finalListRapprLuogo.filter(rappr => {
                                    return rappr["precro:hasLinkedFilmUnitCatalogueRecord"][0]["value_resource_id"] === unita["dcterms:title"][0]["resource_id"]
                                });

                                if (connectedRapprLuogo.length > 0) {
                                    connectedRapprLuogo = connectedRapprLuogo[0];
                                }

                                //console.log("connectedRapprLuogo");
                                //console.log(connectedRapprLuogo);


                                if (body.locusFilters.ucCastMemberName !== null && body.locusFilters.ucCastMemberName !== undefined && body.locusFilters.ucCastMemberName !== "") {
                                    var castMember = connectedRapprLuogo["precro:hasPresentPersonData"].filter(person => {
                                        return person["value"][0]["precro:presentPersonCastMemberName"][0]["value"] === body.locusFilters.ucCastMemberName
                                    });
                                    castMember = castMember.length > 0 ? castMember[0] : null;
                                    if (unita.castMembers === undefined) {
                                        unita.castMembers = [];
                                    }
                                    unita.castMembers.push(castMember["value"][0]);
                                }

                                if (body.locusFilters.ucCharacterName !== null && body.locusFilters.ucCharacterName !== undefined && body.locusFilters.ucCharacterName !== "") {
                                    var characterName = connectedRapprLuogo["precro:hasPresentPersonData"].filter(person => person["value"][0]["precro:presentPersonCharacterName"][0]["value"] === body.locusFilters.ucCharacterName);
                                    characterName = characterName.length > 0 ? characterName[0] : null;
                                    if (unita.characters === undefined) {
                                        unita.characters = [];
                                    }
                                    unita.characters.push(characterName["value"][0]);
                                }

                                //unita["precro:hasPlacesData"] = connectedRapprLuogo["precro:hasPlacesData"];
                                unita["precro:description"] = connectedRapprLuogo["precro:description"];

                                if (connectedRapprLuogo["precro:hasPlacesData"] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:placeRepresentationHasCameraPlacement']) {
                                    console.log("sono in camera placement");
                                    unita["cameraPlacement"] = [];
                                    connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:placeRepresentationHasCameraPlacement'][0]['value'].forEach(cameraPlacement => {
                                        console.log("camera plcement corrente");
                                        //console.log(cameraPlacement);
                                        unita["cameraPlacement"].push({
                                            "resource_id": cameraPlacement['dcterms:title'][0]['resource_id'],
                                            "dcterms:title": cameraPlacement['dcterms:title'][0]['value']
                                        });
                                    });
                                }

                                if (connectedRapprLuogo["precro:hasPlacesData"] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasDisplayedObject']) {
                                    unita["displayedObject"] = {
                                        "resource_id": connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasDisplayedObject'][0]['value'][0]['dcterms:title'][0]['resource_id'],
                                        "dcterms:title": connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasDisplayedObject'][0]['value'][0]['dcterms:title'][0]['value']
                                    }
                                }

                                if (connectedRapprLuogo["precro:hasPlacesData"] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'] && connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasRepresentedNarrativePlace']) {
                                    unita["representedNarrativePlace"] = {
                                        "resource_id": connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasRepresentedNarrativePlace'][0]['value'][0]['dcterms:title'][0]['resource_id'],
                                        "dcterms:title": connectedRapprLuogo["precro:hasPlacesData"][0]['value'][0]['precro:hasSinglePlaceRepresentationData'][0]['value'][0]['precro:placeRepresentationHasRepresentedNarrativePlace'][0]['value'][0]['dcterms:title'][0]['value']
                                    }
                                }

                                if (connectedRapprLuogo["precro:hasContextualElementsData"] && connectedRapprLuogo["precro:hasContextualElementsData"][0]['value'] && connectedRapprLuogo["precro:hasContextualElementsData"][0]['value'][0]['precro:placeRepresentationHasContextualNarrativePlace']) {
                                    unita["contextualNarrativePlace"] = {
                                        "resource_id": connectedRapprLuogo["precro:hasContextualElementsData"][0]['value'][0]['precro:placeRepresentationHasContextualNarrativePlace'][0]['value'][0]['dcterms:title'][0]['resource_id'],
                                        "dcterms:title": connectedRapprLuogo["precro:hasContextualElementsData"][0]['value'][0]['precro:placeRepresentationHasContextualNarrativePlace'][0]['value'][0]['dcterms:title'][0]['value']
                                    }
                                }


                                const {filmId, filmTitle, filmImageUrl, genres} = getFilmInfo(unita);

                                // Rimuovo chiavi che non mi servono
                                delete unita["fiucro:hasSelectedScreenshot"];
                                delete unita["fiucro:hasLinkedFilmCopyCatalogueRecord"];
                                delete unita["fiucro:hasFilmUnitDurationData"];
                                delete unita["fiucro:hasCompositionalAspectsData"];
                                delete unita["cro:notes"];


                                if (!catalogoFilm[filmId]) {
                                    catalogoFilm[filmId] = {
                                        filmId: filmId,
                                        filmTitle: filmTitle,
                                        filmImageUrl: filmImageUrl,
                                        genres: genres,
                                        unita: []
                                    };
                                }

                                catalogoFilm[filmId].unita.push(unita);
                            });

                            // Stampare il catalogo dei film con le unità catalografiche associate
                            //console.log("CATALOGO FILM");
                            //console.log(catalogoFilm);

                            // Altrimenti esegui la logica della post
                            // ...
                            //return connectedRapprLuogo;
                            //TODO: rimettere il return sotto
                            return catalogoFilm;


                        }).then(function (catalogoFilm) {
                            console.log("SECONDO THEN OTTENGO CATALOGO FILM");


                            var catalogoFilmArray = Object.keys(catalogoFilm).map(key => {
                                return catalogoFilm[key];
                            })

                            res.json(catalogoFilmArray);

                            //res.send(catalogoFilm);
                        });

                    } else {
                        res.json([]);
                    }


                } else if (rapprLuogoFilmFilters.length === 0) {
                    //TODO: restituire un messaggio che dica che non sono stati trovati dei risultati per i filtri sui film
                    res.json({message: 'I filtri sui film non hanno prodotto alcun risultato'});
                } else if (rapprLuogoLocusFilters.length === 0) {
                    //TODO: restituire un messaggio che dica che non sono stati trovati dei risultati per i filtri sui luoghi
                    res.json({message: 'I filtri sui locus non hanno prodotto alcun risultato'});
                }
            }


            console.log("filteredRapprLuogo FILTRATI PER FILM");
            console.log(filteredRapprLuogo);


        });
    }
}

// Funzione per estrarre l'ID del film e il titolo da un'unità catalografica
function getFilmInfo(unita) {
    const filmInfo = unita["fiucro:hasLinkedFilmCopyCatalogueRecord"][0]["value"][0]["ficocro:hasLinkedFilmCatalogueRecord"][0]["value"][0]["dcterms:title"][0];

    var filmImageUrl = null;
    var imageData = unita["fiucro:hasLinkedFilmCopyCatalogueRecord"][0]["value"][0]["ficocro:hasLinkedFilmCatalogueRecord"][0]["value"][0]["ficro:hasImageData"];

    if (imageData) {
        filmImageUrl = imageData[0]["value"][0]["ficro:caption"][0]["media_link"];
    }

    //console.log("FILM INFO");
    //console.log(unita["fiucro:hasLinkedFilmCopyCatalogueRecord"][0]["value"][0]["ficocro:hasLinkedFilmCatalogueRecord"][0]["value"][0]);

    var genres = unita["fiucro:hasLinkedFilmCopyCatalogueRecord"][0]["value"][0]["ficocro:hasLinkedFilmCatalogueRecord"][0]["value"][0]["ficro:hasTypologyData"];
    //console.log("GENRES");
    //console.log(genres);
    return {
        filmId: filmInfo.resource_id,
        filmTitle: filmInfo.value,
        filmImageUrl: filmImageUrl,
        genres: genres,
    };
}


// Funzione per convertire una data nel formato 'anno era' in un oggetto { year, era }
function convertDate(dateString) {

    var bufferYear = 3;

    if (!dateString.includes('ca.')) {
        const [year, era] = dateString.split(' ');
        const parsedYear = parseInt(year) * (era === 'a.C.' ? -1 : 1);
        return [new Date(parsedYear, 0)]; // Mese 0 rappresenta gennaio
    } else {
        const split = dateString.split(' ');
        var parsedYear = parseInt(split[0]);

        if (split.length === 3) {
            parsedYear = parsedYear * (split[1] === 'a.C.' ? -1 : 1);

            if (split[1] === 'a.C.') {
                return [new Date(parsedYear - bufferYear, 0), new Date(parsedYear + bufferYear, 0)];
            } else {
                return [new Date(parsedYear - bufferYear, 0), new Date(parsedYear + bufferYear, 0)];
            }
        } else {
            return [new Date(parsedYear - bufferYear, 0), new Date(parsedYear + bufferYear, 0)];
        }
    }

}

// Funzione per convertire una data nel formato 'anno era' in un oggetto Date
function convertToDate(dateString) {
    const [year, era] = dateString.split(' ');
    const numericYear = parseInt(year) * (era === 'a.C.' ? -1 : 1);
    return new Date(numericYear, 0); // Mese 0 rappresenta gennaio
}

// Funzione per verificare se una data rientra nell'intervallo specificato dall'utente
function checkDateInRange(date, fromDate, toDate) {
    return date >= fromDate && date <= toDate;
}
