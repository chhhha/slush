-- complete_cooling: 냉각 완료 자동 전환 RPC 함수
-- anon 클라이언트에서 호출 가능하되, DB 레벨에서 cooling_end_at <= now() 검증
create or replace function complete_cooling(p_machine_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_updated boolean;
begin
  update machines
  set status = 'available',
      available_since = now(),
      cooling_end_at = null,
      updated_at = now()
  where id = p_machine_id
    and status = 'cooling'
    and cooling_end_at <= now()
  returning true into v_updated;

  if v_updated then
    insert into status_logs (machine_id, previous_status, new_status, changed_by_type, note)
    values (p_machine_id, 'cooling', 'available', 'system', '냉각 완료 자동 전환');
  end if;

  return coalesce(v_updated, false);
end;
$$;
