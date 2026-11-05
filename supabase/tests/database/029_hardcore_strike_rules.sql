begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select is(private.evaluate_hardcore_strikes(2, 1, 'A', 'A', false), 1,
  'correct committed answer does not increment strikes');
select is(private.evaluate_hardcore_strikes(2, 0, 'A', 'B', false), 1,
  'wrong committed answer increments strikes');
select is(private.evaluate_hardcore_strikes(2, 1, 'A', 'C', false), 2,
  'second miss reaches the two-strike cap');
select is(private.evaluate_hardcore_strikes(3, 1, 'A', 'UNKNOWN', true), 2,
  'enabled I Don''t Know earns a strike');
select throws_ok($$select private.evaluate_hardcore_strikes(1, 0, 'A', 'UNKNOWN', false)$$,
  '22023', null, 'disabled I Don''t Know is rejected');
select throws_ok($$select private.evaluate_hardcore_strikes(4, 0, 'A', 'A', true)$$,
  '22023', null, 'unsupported cap is rejected');
select throws_ok($$select private.evaluate_hardcore_strikes(2, 2, 'A', 'A', true)$$,
  '22023', null, 'terminal strike state cannot be evaluated again');
select ok(not has_function_privilege('authenticated',
  'private.evaluate_hardcore_strikes(integer,integer,text,text,boolean)', 'execute'),
  'authenticated clients cannot call the private evaluator');
select * from finish();
rollback;
