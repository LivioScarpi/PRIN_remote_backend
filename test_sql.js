var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "omekas_prin_2022",
  database: "omekas_db"
});

console.log("CONNECTION STATE");
console.log(con.state)

function getResourceFromID(id) {
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
      v1.resource_id = ${id}
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
  let prom = new Promise((resolve, reject) => {
    con.query(
      query,
      (err, rows) => {
        // console.log(rows);
        if (err) {
          return reject(err);
        } else {
          resolve(rows);
        }
      });
  });

  prom.then(
    function(rows) {
      let result = Object.values(JSON.parse(JSON.stringify(rows)));

        object = result.reverse();
        var object = object.reduce(function (r, a) {
          r[a.resource_id] = r[a.resource_id] || [];
          r[a.resource_id].push(a);
          return r;
        }, Object.create(null));

        for (let key in object) {
          // console.log("KEY: " + key);
          // console.log(object[key]);

          object[key].forEach(property => {
            if(property.value_resource_id !== null) {
              //la property collega una risorsa
              // console.log("DEVO METTERE UN OGGETTO");
              // console.log(object[property.value_resource_id]);
              property.value = JSON.parse(JSON.stringify(object[property.value_resource_id]));
            }
          });
          
        };

        console.log(object);

        return object;
    });
};

getResourceFromID(552)
  .then(result => console.log("PIPPo"))
  .catch(err => console.log(String(err)));
