-- Private rule for a committed Next action, not for answer selection.
create function private.evaluate_hardcore_strikes(
  p_cap integer,
  p_strikes integer,
  p_correct_option text,
  p_response text,
  p_allow_unknown boolean
) returns integer
language plpgsql immutable set search_path = pg_catalog
as $$
begin
  if p_cap is null or p_cap not in (1, 2, 3)
    or p_strikes is null or p_strikes < 0 or p_strikes >= p_cap then
    raise invalid_parameter_value using message = 'Invalid or terminal Hardcore strike state.';
  end if;
  if p_correct_option is null or p_correct_option not in ('A', 'B', 'C', 'D')
    or p_response is null or p_allow_unknown is null
    or (p_response not in ('A', 'B', 'C', 'D')
        and not (p_response = 'UNKNOWN' and p_allow_unknown)) then
    raise invalid_parameter_value using message = 'Invalid Hardcore response.';
  end if;
  return p_strikes + case when p_response = p_correct_option then 0 else 1 end;
end;
$$;

revoke all on function private.evaluate_hardcore_strikes(integer, integer, text, text, boolean)
  from public, anon, authenticated, service_role;
