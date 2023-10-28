/*ottieni tutti i dati di un item*/

WITH
  RECURSIVE test as (
    SELECT
      v1.resource_id,
      v1.property_id,
      v1.value_resource_id,
      v1.value
    FROM
      value as v1
    WHERE
      v1.resource_id = 552
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
  property.label,
  vocabulary.prefix as vocabulary_prefix,
  r2.local_name,
  r2.label
from
  test
  join property on test.property_id = property.id
  join vocabulary on property.vocabulary_id = vocabulary.id
  join resource as r1 on test.resource_id = r1.id
  join resource_class as r2 on r1.resource_class_id = r2.id;

/*ottieni tutti i valori degli item di una classe*/

WITH RECURSIVE test as ( 
  SELECT v1.resource_id, v1.property_id, v1.value_resource_id, v1.value 
  FROM `value` as v1 
  WHERE v1.resource_id = 552 OR v1.resource_id=714  UNION (
    SELECT v2.resource_id, v2.property_id, v2.value_resource_id, v2.value 
    FROM `value` as v2 INNER JOIN test ON test.value_resource_id = v2.resource_id))
    
select test.resource_id, test.property_id, test.value_resource_id, test.value, property.local_name, property.label, vocabulary.prefix, r2.local_name, r2.label 
from test join property on test.property_id = property.id 
join vocabulary on property.vocabulary_id = vocabulary.id 
    join resource as r1 on test.resource_id = r1.id 
    join resource_class as r2 on r1.resource_class_id = r2.id;
