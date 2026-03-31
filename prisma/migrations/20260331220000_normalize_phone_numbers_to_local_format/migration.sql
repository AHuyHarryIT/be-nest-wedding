UPDATE customers
SET phone_number = CASE
  WHEN regexp_replace(phone_number, '[\s\-().]', '', 'g') LIKE '+84%' THEN
    '0' || substring(regexp_replace(phone_number, '[\s\-().]', '', 'g') from 4)
  WHEN regexp_replace(phone_number, '[\s\-().]', '', 'g') LIKE '84%' THEN
    '0' || substring(regexp_replace(phone_number, '[\s\-().]', '', 'g') from 3)
  ELSE regexp_replace(phone_number, '[\s\-().]', '', 'g')
END;

UPDATE staffs
SET phone_number = CASE
  WHEN regexp_replace(phone_number, '[\s\-().]', '', 'g') LIKE '+84%' THEN
    '0' || substring(regexp_replace(phone_number, '[\s\-().]', '', 'g') from 4)
  WHEN regexp_replace(phone_number, '[\s\-().]', '', 'g') LIKE '84%' THEN
    '0' || substring(regexp_replace(phone_number, '[\s\-().]', '', 'g') from 3)
  ELSE regexp_replace(phone_number, '[\s\-().]', '', 'g')
END;
