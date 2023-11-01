const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const { parse } = require("url");

const production = true;
const functions = require("./composeFilmQuery");

const app = express();
const cors = require("cors");

const portNumber = production ? 3004 : 3003;
const dbname = production ? "omekas_production_db" : "omekas_db";

const corsOptions = {
    origin: '*', // Sostituisci con l'URL del tuo frontend
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

app.get("/server/overview", (req, res) => {
    res.send('Welcome to the "overview page" of the nginX project');
});

app.get("/server/jsontest", (req, res) => {
    res.json({
        product_id: "xyz12u3",
        product_name: "NginX injector",
    });
});

app.get("/server/get_all_films_db", (req, res) => {
    getAllFilmsDB(res);
});

app.get("/server/get_all_locus_db", (req, res) => {
    getAllLocusDB(res);
});

app.get("/server/get_schede_av_of_film", (req, res) => {
    getSchedeAVofFilm(res, req);
});

app.post("/server/get_unita_catalografiche_of_film", (req, res) => {
    getUnitaCatalograficheOfFilm(res, req);
});

app.post("/server/get_schede_luoghi_of_uc", (req, res) => {
    getSchedeRappresentazioneLuoghiOfUnitaCatalografica(res, req);
});

app.get("/server/get_all_locus_related_to_one", (req, res) => {
    getAllLocusRelatedToOne(res, req);
});

app.get("/server/get_film_filters", (req, res) => {
    getFilmFilters(res);
});

app.post("/server/search_films", (req, res) => {
    searchFilm(res, req);
});

app.post("/server/get_locus_of_film", (req, res) => {
    getLocusOfFilmByFilmID(res, req);
});

app.post("/server/get_resource_from_id", (req, res) => {
    try {
        const resource_id = req.body.resource_id;
        getResourceFromID(resource_id, res);
    } catch (err) {
        console.log(err);
    }
});

app.get("/", (req, res) => {
    console.log("ORA INVIO LA RISPOSTA");
    res.send("Successfully started a server");
});

app.listen(portNumber, "localhost", () => {
    console.log("Listening for requests");
});

function getResourceFromID(id, res) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: dbname
    });


    var query = `WITH RECURSIVE test as ( 
        SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value, v1.uri
        FROM value as v1 
        WHERE v1.resource_id=${id}
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

    let prom = new Promise((resolve, reject) => {
        con.query(
            query,
            (err, rows) => {
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

                    var objectListFinal = object.get(id);


                    resolve({objectListFinal, res});
                }
            });
    });

    prom.then(
        function ({objectListFinal, res}) {
            console.log("HO OTTWNUTO OBJETCT RESOLVE");
            console.log(objectListFinal);

            if (objectListFinal === undefined) {
                objectListFinal = null;
            }

            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(
                JSON.stringify(objectListFinal)
            );

            con.end();
        });

    prom.catch(function (err) {
        res.writeHead(200, {"Content-Type": "text"});
        res.end(
            "Si è verificato un errore nella richiesta"
        );

        con.end();
    });
};

function getAllFilmsDB(res) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: dbname
    });

    return getResourcesFromClassName("FilmCatalogueRecord", con, res);
}

function getAllLocusDB(res) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: dbname
    });

    return getResourcesFromClassName("LocusCatalogueRecord", con, res);
}

function getResourcesFromClassName(className, con, res) {

    //chiedo la lista di film
    var query = `SELECT r.id as object_id, rc.id as class_id, rc.local_name as class_name, rc.label FROM resource r join resource_class rc on r.resource_class_id=rc.id WHERE rc.local_name="${className}"`;

    let filmsList = new Promise((resolve, reject) => {
        con.query(
            query,
            (err, rows) => {
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
    filmsList.then(
        function ({list, res}) {
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
                                    console.log("KEY: " + key);
                                    console.log(arr[key]);

                                    for (let internalKey in arr[key]) {
                                        var property = arr[key][internalKey];
                                        console.log("SONO QUA");
                                        console.log(property);

                                        property.forEach(prop => {
                                            if (prop.value_resource_id !== null) {
                                                //la property collega una risorsa

                                                console.log("\n\n\n\nORA PROP VALUE E'");
                                                console.log(prop.value);

                                                if (prop.value === undefined || prop.value === null) {
                                                    prop.value = [];
                                                    console.log("\nDEVO METTERE UN OGGETTO");

                                                    console.log("\n\n STAMPO")
                                                    console.log(arr[prop.value_resource_id]);
                                                    prop.value.push(JSON.parse(JSON.stringify(arr[prop.value_resource_id])));
                                                } else {
                                                    console.log("\nDEVO METTERE UN OGGETTO");
                                                    console.log("\n\n STAMPO")
                                                    console.log(arr[prop.value_resource_id]);
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
                                    console.log("KEY: " + key);
                                    console.log(list);
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
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(
                    JSON.stringify([])
                );

                con.end();
            }

        });


};


function getSchedeAVofFilm(res, req) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: dbname
    });

    console.log("REQ FILM ID");
    console.log(req.body.film_id);

    if (req.body.film_id) {
        //chiedo la lista di film
        var query = `SELECT resource_id FROM value WHERE value_resource_id=${req.body.film_id}`;

        let idsSchedeAVofFilm = new Promise((resolve, reject) => {
            con.query(
                query,
                (err, rows) => {
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
        idsSchedeAVofFilm.then(
            function ({list, res}) {
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
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(
                        JSON.stringify([])
                    );

                    con.end();
                }


            });
    } else {
        res.writeHead(200, {"Content-Type": "text"});
        res.end(
            "An error has occurred"
        );

        con.end();
    }
}


function getUnitaCatalograficheOfFilm(res, req) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: dbname
    });

    console.log("REQ FILM ID");
    console.log(req.body.film_id);

    if (req.body.film_id) {
        //chiedo la lista di film
        var query = `SELECT distinct uc.resource_id FROM value as f join value as fc on f.resource_id = fc.value_resource_id join value as uc on fc.resource_id = uc.value_resource_id where f.resource_id =${req.body.film_id}`;

        let idsSchedeAVofFilm = new Promise((resolve, reject) => {
            con.query(
                query,
                (err, rows) => {
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
        idsSchedeAVofFilm.then(
            function ({list, res}) {
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
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(
                        JSON.stringify([])
                    );

                    con.end();
                }

            });
    } else {
        res.writeHead(200, {"Content-Type": "text"});
        res.end(
            "An error has occurred"
        );

        con.end();
    }
}


function getSchedeRappresentazioneLuoghiOfUnitaCatalografica(res, req) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: dbname
    });

    console.log("REQ UC ID");
    console.log(req.body.uc_id);

    if (req.body.uc_id) {
        //chiedo la lista di film
        var query = `SELECT distinct resource_id FROM value where value_resource_id =${req.body.uc_id}`;

        let idsSchedeAVofFilm = new Promise((resolve, reject) => {
            con.query(
                query,
                (err, rows) => {
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
        idsSchedeAVofFilm.then(
            function ({list, res}) {
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
    left join media as m on test.resource_id = m.item_id;
          `;

                    makeInnerQuery(con, res, query, list);

                } else {
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(
                        JSON.stringify([])
                    );

                    con.end();
                }

            });
    } else {
        res.writeHead(200, {"Content-Type": "text"});
        res.end(
            "An error has occurred"
        );

        con.end();
    }
}


function getFilmFilters(res, req) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: dbname
    });

    //chiedo la lista di film
    var query = `SELECT distinct property_id, value, p.local_name FROM value v join property p on v.property_id = p.id where property_id in (
                    SELECT distinct p.id FROM property p join vocabulary v on p.vocabulary_id = v.id where p.local_name in ("genre", "titleType", "titleLanguage", "productionCompanyCountry", "productionCompanyName", "dateTypology", "lighting", "cameraAngle", "tilt", "cameraShotType", "hasMatte", "cameraPlacement", "cameraMotion", "colouring") and (v.prefix = "ficro" or v.prefix = "fiucro") 
                    )`;

    let filters = new Promise((resolve, reject) => {
        con.query(
            query,
            (err, rows) => {
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
    filters.then(
        function ({list, res}) {
            console.log("RES NEL THEN");

            var genres = list.filter(obj => obj.local_name === "genre");
            var titleType = list.filter(obj => obj.local_name === "titleType");
            var titleLanguage = list.filter(obj => obj.local_name === "titleLanguage");
            var productionCountry = list.filter(obj => obj.local_name === "productionCompanyCountry");
            var productionName = list.filter(obj => obj.local_name === "productionCompanyName");
            var dateTypology = list.filter(obj => obj.local_name === "dateTypology");

            /*linguaggio e stile*/
            var lighting = list.filter(obj => obj.local_name === "lighting");
            var cameraAngle = list.filter(obj => obj.local_name === "cameraAngle");
            var tilt = list.filter(obj => obj.local_name === "tilt");
            var cameraShotType = list.filter(obj => obj.local_name === "cameraShotType");
            var matte = list.filter(obj => obj.local_name === "hasMatte");
            var pointOfView = list.filter(obj => obj.local_name === "cameraPlacement");
            var cameraMotion = list.filter(obj => obj.local_name === "cameraMotion");
            var colouring = list.filter(obj => obj.local_name === "colouring");


            var result = {
                genres: genres,
                titleType: titleType,
                titleLanguage: titleLanguage,
                productionCountry: productionCountry,
                productionName: productionName,
                dateTypology: dateTypology,
                lighting: lighting,
                cameraAngle: cameraAngle,
                tilt: tilt,
                cameraShotType: cameraShotType,
                matte: matte,
                pointOfView: pointOfView,
                cameraMotion: cameraMotion,
                colouring: colouring
            }
            //list = list.map(film => film.resource_id);
            //console.log("LISTA IDDDDDD");
            //console.log(list);

            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(
                JSON.stringify(result)
            );

            con.end();
        });


    filters.catch(
        function ({list, res}) {
            res.writeHead(200, {"Content-Type": "text"});
            res.end(
                "An error has occurred"
            );

            con.end();
        });

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
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: dbname
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
            con.query(
                query,
                (err, rows) => {
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
        idsSchedeAVofFilm.then(
            function ({list, res}) {
                console.log("RES NEL THEN");

                console.log("LISTA PRIMA");
                console.log(list);

                //list = list.map(film => film.resource_id);
                //console.log("LISTA IDDDDDD");
                //console.log(list);

                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(
                    JSON.stringify(list)
                );

                con.end();
            });
    } else {
        res.writeHead(200, {"Content-Type": "text"});
        res.end(
            "An error has occurred"
        );

        con.end();
    }
}

function makeInnerQuery(con, res, query, list) {
    let prom = new Promise((resolve, reject) => {
        con.query(
            query,
            (err, rows) => {
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

    prom.then(
        function ({objectListFinal, res}) {
            console.log("HO OTTWNUTO OBJETCT RESOLVE");

            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(
                JSON.stringify(objectListFinal)
            );

            con.end();
        });

    prom.catch(function (err) {
        res.writeHead(200, {"Content-Type": "text"});
        res.end(
            "Si è verificato un errore nella richiesta"
        );

        con.end();
    });
}

function searchFilm(res, req) {
    body = JSON.parse(JSON.stringify(req.body));

    console.log("OBJECT FILTERS");
    console.log(body);

    if (areAllFiltersEmpty(body)) {
        console.log("Tutte le chiavi dell'oggetto sono vuote.");

        //TODO: implementare la query di base che ottiene tutti i film;
        getAllFilmsDB(res);
    } else {
        console.log("Almeno una chiave dell'oggetto non è vuota.");
        var con = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "omekas_prin_2022",
            database: dbname
        });

        var query_parts = [false, false, false, false, false, false, false, false, false, false, false]
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

        if (functions.checkDateTypology(body)) {
            if (functions.checkForTrueUpToIndex(query_parts, 10)) {
                query += "\nINTERSECT\n";
            }

            query += functions.composeDateTypology(body);
            query_parts[10] = true;
        }

        query += '\n) AS films';

        console.log("query_parts");
        console.log(query_parts)
        console.log("\n\n\n\nQUERY FINALE FILMS\n");
        console.log(query);


        //TODO: implementare le ue query

        let idsFilms = new Promise((resolve, reject) => {
            con.query(
                query,
                (err, rows) => {
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
        idsFilms.then(
            function ({list, res}) {
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
    left join media as m on test.resource_id = m.item_id;
          `;

                    makeInnerQuery(con, res, query, list);

                } else {
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(
                        JSON.stringify([])
                    );

                    con.end();
                }

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
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(
            JSON.stringify([])
        );
    } else {
        console.log("Film ID present");
        var con = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "omekas_prin_2022",
            database: dbname
        });


        const queries = [
            `START TRANSACTION`,

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

            `COMMIT;`,
            // Aggiungi altre query qui
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

                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(
                    JSON.stringify(results)
                );

            }
        }

        executeBatchQueries(queries);
    }
}

function areAllFiltersEmpty(obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (obj[key] === "" || (Array.isArray(obj[key]) && obj[key].length === 0)) {
                continue;
            } else {
                return false;
            }
        }
    }
    return true;
}