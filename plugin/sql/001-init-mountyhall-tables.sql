
create table mountyhall_partage (
	player bigserial references player(id),
	room integer references room(id),
	primary key(player, room)
);
create index mountyhall_partage_room on mountyhall_partage(room);

create type mountyhall_sp_script as enum(
	'Profil2',
	'Vue2'
);

create type mountyhall_sp_call_result as enum(
	'ok',
	'error',
	'bad-password'
);

create table mountyhall_sp_call (
	troll integer not null,
	call_date integer not null,
	requester bigserial references player(id),
	script mountyhall_sp_script not null,
	sp_result mountyhall_sp_call_result not null
);
create index mountyhall_sp_call_troll_date on mountyhall_sp_call(troll, call_date);
