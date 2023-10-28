const http = require("http");
var url = require('url');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
var mysql = require('mysql');

const server = http.createServer((req, res) => {
    const urlPath = req.url;
    console.log("REQ TEST");
    console.log(urlPath);
    console.log(req.body);
    var params = url.parse(req.url, true).query;
    console.log(params);

    var body = null;

    jsonParser(req, res, (error) => {
        // request.body is populated, if there was a json body
        console.log("CORPO PIENO?");
        console.log(req.body);
        console.log("\n\n\n");
        body = JSON.parse(JSON.stringify(req.body));
        console.log("REQ.BODY.JOBS\n");
        console.log(req.body.jobs);

        console.log("HO STAMPATO I JOBS");
        console.log(body);

        if (urlPath === "//overview") {
            res.end('Welcome to the "overview page" of the nginX project');
        } else if (urlPath === "//jsontest") {
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(
                JSON.stringify({
                    product_id: "xyz12u3",
                    product_name: "NginX injector",
                })
            );
        } else if (urlPath === "//get_film_db") {
            getFilmDB(res);
        } else if (urlPath === "//get_all_films_db") {
            getAllFilmsDB(res);
        } else if (urlPath === "//get_all_locus_db") {
            getAllLocusDB(res);
        } else if (urlPath === "//get_schede_av_of_film") {
            getSchedeAVofFilm(res, req);
        } else if (urlPath === "//get_unita_catalografiche_of_film") {
            getUnitaCatalograficheOfFilm(res, req);
        } else if (urlPath === "//get_schede_luoghi_of_uc") {
            getSchedeRappresentazioneLuoghiOfUnitaCatalografica(res, req);
        } else {
            console.log("ORA INVIO LA RISPOSTA");
            res.end("Successfully started a server \n" + JSON.stringify(body));
        }
    });
});

server.listen(3003, "localhost", () => {
    console.log("Listening for request");
});

function getFilmDB(res) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: "omekas_db"
    });

    // return getResourceFromID(879, con, res);

    return getResourceFromID(552, con, res);
}

function getResourceFromID(id, con, res) {
    var query = `WITH
  RECURSIVE test as (
    SELECT
      v1.resource_id,
      v1.property_id,
      v1.value_resource_id,
      v1.value
    FROM
      value as v1
    WHERE
      v1.resource_id = 942
    UNION
    (
      SELECT
        v2.resource_id,
        v2.property_id,
        v2.value_resource_id,
        v2.value
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
    r2.label
  from
    test
    join property on test.property_id = property.id
    join vocabulary on property.vocabulary_id = vocabulary.id
    join resource as r1 on test.resource_id = r1.id
    join resource_class as r2 on r1.resource_class_id = r2.id;`;

    //TODO: mettere blocco try-catch

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

                    //  finalObject = arr;

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


                    // // console.log(object);
                    object = object[id];

                    var finalObject = {};

                    object.forEach(property => {
                        var propertyName = property["vocabulary_prefix"] + ":" + property["property_name"];

                        if (!finalObject[propertyName]) {
                            finalObject[propertyName] = [property];
                        } else {
                            finalObject[propertyName].push(property);
                        }

                    });


                    resolve({finalObject, res});
                }
            });
    });

    console.log("CIAO SONO DOPO IL PROM");

    prom.then(
        function ({finalObject, res}) {
            // console.log("RES NEL THEN");
            // console.log(res);
            console.log("HO OTTWNUTO OBJETCT RESOLVE");
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(
                JSON.stringify(finalObject)
            );
        });

    prom.catch(function (err) {
        console.log("ERROREEE");
        res.writeHead(200, {"Content-Type": "text"});
        res.end(
            "Si è verificato un errore nella richiesta"
        );
    })
};

function getAllFilmsDB(res) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: "omekas_db"
    });

    return getResourcesFromClassName("FilmCatalogueRecord", con, res);
}

function getAllLocusDB(res) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: "omekas_db"
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
            }

        });


};


function getSchedeAVofFilm(res, req) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: "omekas_db"
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
                }


            });
    } else {
        res.writeHead(200, {"Content-Type": "text"});
        res.end(
            "An error has occurred"
        );
    }
}


function getUnitaCatalograficheOfFilm(res, req) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: "omekas_db"
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
                }

            });
    } else {
        res.writeHead(200, {"Content-Type": "text"});
        res.end(
            "An error has occurred"
        );
    }
}


function getSchedeRappresentazioneLuoghiOfUnitaCatalografica(res, req) {
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "omekas_prin_2022",
        database: "omekas_db"
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
                }

            });
    } else {
        res.writeHead(200, {"Content-Type": "text"});
        res.end(
            "An error has occurred"
        );
    }
}

function makeInnerQuery(con, res, query, list){
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
        });

    prom.catch(function (err) {
        res.writeHead(200, {"Content-Type": "text"});
        res.end(
            "Si è verificato un errore nella richiesta"
        );
    });
}