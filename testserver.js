// Importa osmtogeojson utilizzando require
const osmtogeojson = require("osmtogeojson");

const turf = require("@turf/turf");
const turfFunctions = {...turf};

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

const portNumber = production ? 3004 : 3003;
const dbname = production ? "omekas_production_db" : "omekas_db";

var updatingRelationships = false;

// Middleware per il caching
/*
const cacheMiddleware = (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url;
    const cachedData = cache.get(key);

    if (cachedData) {
        // Se i dati sono presenti nella cache, inviali direttamente
        res.send(cachedData);
    } else {
        // Altrimenti, continua con l'esecuzione normale e salva i dati nella cache successivamente
        res.sendResponse = res.send;
        res.send = (body) => {
            cache.set(key, body); // Salva i dati in cache con il timeout predefinito
            res.sendResponse(body);
        };
        next();
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

            return res.send(cachedResponseObject);
            // Se la risposta è presente nella cache, restituisci solo la parte richiesta
            //return sendPaginatedResponse(res, cachedResponseObject, req.query.page || 1, totalResults);
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
                //sendPaginatedResponse(res, bodyObject, req.query.page || 1, totalResults);

                res.sendResponse(bodyObject);
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

            return res.send(cachedResponseObject);
            //return sendPaginatedResponse(res, cachedResponseObject, req.query.page || 1, totalResults);
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

                    //console.log(body);

                    var bodyObject = body;
                    var totalResults = null;
                    if (Array.isArray(bodyObject)) {
                        totalResults = bodyObject.length;
                        console.log("GET - CALCOLO TOTAL RESULTS: " + totalResults);
                        //bodyObject = null;
                    } else {
                        console.log("GET - NON CALCOLO TOTAL RESULTS PERCHE' NON E' UN ARRAY");
                    }

                    res.sendResponse(bodyObject);
                    //sendPaginatedResponse(res, bodyObject, req.query.page || 1, totalResults);
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
    const cachedData = cache.get(key);

    if (cachedData) {
        console.log("DATI IN CACHE");
        // Se i dati sono presenti nella cache, inviali direttamente
        res.send(cachedData);
    } else {
        console.log("DATI NON IN CACHE");

        // Altrimenti, continua con l'esecuzione normale e salva i dati nella cache successivamente
        res.sendResponse = res.send;
        res.send = (body) => {
            console.log("INTERCETTO LA RISPOSTA E SALVO IN CACHE");
            cache.set(key, body); // Salva i dati in cache con il timeout predefinito
            console.log("CHIAMO res.sendResponse(body);");
            res.sendResponse(body);
        };
        console.log("CHIAMO NEXT");
        next();
    }
};

app.get("/server/overview", (req, res) => {
    res.send('Welcome to the "overview page" of the nginX project');
});

app.get("/server/jsontest", (req, res) => {
    res.json({
        product_id: "xyz12u3", product_name: "NginX injector",
    });
});

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


    const server = app.listen(portNumber, "localhost", () => {
        connection.end();
        console.log("Connessione chiusa");

        console.log("Server in ascolto sulla porta " + portNumber);
        console.log("DB name: " + dbname);


        // Schedula l'esecuzione del metodo alle 3 di notte (alle 3:00 AM)
        //cron.schedule('0 3 * * *', updateData);

        // Aggiornamento delle strutture dati ogni tot millisecondi (ad esempio ogni 24 ore)
        //const intervalInMilliseconds = 360000; //1 * 60 * 60 * 1000; // 24 ore
        //setInterval(updateData, intervalInMilliseconds);
    });
    //server.setTimeout(500000);
    server.timeout = 120000;
    console.log("Ho messo il timeout");
});

app.get("/server/get_all_locus_homepage_db", express.json(), cacheMiddleware, (req, res) => {
    getAllLocusHomepageDB(res);
});

app.get('/server/dati', cacheMiddleware, (req, res) => {
    // Simuliamo il calcolo dei dati (puoi sostituire questo blocco con la tua logica effettiva)
    const dati = [{
        message: 'Questi sono i dati calcolati',
        timestamp: new Date().toISOString(),
    },{
        message: 'Questi sono i dati calcolati',
        timestamp: new Date().toISOString(),
    },{
        message: 'Questi sono i dati calcolati',
        timestamp: new Date().toISOString(),
    },{
        message: 'Questi sono i dati calcolati',
        timestamp: new Date().toISOString(),
    },{
        message: 'Questi sono i dati calcolati',
        timestamp: new Date().toISOString(),
    },{
        message: 'Questi sono i dati calcolati',
        timestamp: new Date().toISOString(),
    },{
        message: 'Questi sono i dati calcolati',
        timestamp: new Date().toISOString(),
    }];

    console.log("CHIAMO RES.JSON");
    // Invia i dati al client
    res.json(dati);
    console.log("RES.JSON ESEGUITO");
});


function getAllLocusHomepageDB(res, sendToClient = true) {
    var con = mysql.createConnection({
        host: "localhost", user: "root", password: "omekas_prin_2022", database: dbname
    });

    return getLocusHomepage("LocusCatalogueRecord", con, res, sendToClient);
}


function getLocusHomepage(className, con, res, sendToClient = true) {
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
  where property.local_name IN ("title", "hasBasicCharacterizationData", "realityStatus",  "name", "description", "hasImageData", "hasTypeData", "hasIRITypeData", "type", "hasIRIType", "typeName");`;

            //console.log("QUERY");
            //console.log(query);

            return makeInnerQuery(con, res, query, list, sendToClient);
        } else {

            res.send([]);

            con.end();
        }

    });


};

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
            res.send(objectListFinal);
        } else {
            console.log("LI INVIO AL METODO CHIAMANTE");
            return objectListFinal;
        }

    });
}
