## SQL QUERIES ##

### Total Transactions with >0 events and all data ingested
```bash
select count(*) from transactions_details 
where highlighted_event_status = "SUCCESS" 
and status = 'SUCCESS' 
and total_events >0
;
```

### Total Transactions with some events and all data ingested + etherscan has text summary
```bash
select count(*) from transactions_details where 
highlighted_event_texts is not null 
and highlighted_event_status = "SUCCESS" and status = 'SUCCESS' and total_events >0;
;
```

### Total Transactions with some events and all data ingested + etherscan has method name instead of text summary
```bash
select count(*) from transactions_details where 
highlighted_event_status = "SUCCESS" and status = 'SUCCESS' and total_events >0
and highlighted_event_method_name is not null;
;
```

### Total Transactions with some events and all data ingested but 0 decoded events
```bash
select count(*) from transactions_details where 
highlighted_event_texts is not null 
and highlighted_event_status = "SUCCESS" and status = 'SUCCESS' and total_events >0 and total_decoded_events = 0;
;
```

### Total Transactions with some events and all data ingested + some events decoded not all
```bash
select count(*) from transactions_details where 
highlighted_event_texts is not null 
and highlighted_event_status = "SUCCESS" and status = 'SUCCESS' and total_events >0 
and total_decoded_events > 0 and total_decoded_events != total_events;
;
```

### Total Transactions with some events and all data ingested + all events decoded
```bash

select count(*) from transactions_details where 
highlighted_event_texts is not null 
and highlighted_event_status = "SUCCESS" and status = 'SUCCESS' and total_events >0 
and total_decoded_events = total_events;
;
```

### Report: first word from text summaries with count + more than 1 event (part 1) - without basic eth
```bash

SELECT
    SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) AS firstWord,
    COUNT(*) AS count
FROM
(select * from transactions_details where 
highlighted_event_texts is not null 
and highlighted_event_status = "SUCCESS" and status = 'SUCCESS' and total_events >0 ) as a
GROUP BY
    firstWord
ORDER BY
    count DESC;
```    

### Report: first word from text summaries with count + more than 1 event + all events decoded (2c)
```bash

SELECT
    SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) AS firstWord,
    COUNT(*) AS count
FROM
(select * from transactions_details where 
highlighted_event_texts is not null 
and highlighted_event_status = "SUCCESS" and status = 'SUCCESS' and total_events >0 
and total_decoded_events = total_events) as a
GROUP BY
    firstWord
ORDER BY
    count DESC;
```    

### Report: Fetch Count of text summaries
```bash
SELECT JSON_LENGTH(highlighted_event_texts) from transactions_details;
```