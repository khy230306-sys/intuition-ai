# AIZIO Relationship Memory

Stores family/friend links from natural conversation (`jarvis_relationships_v1`).

## Examples

- 「우리 엄마 이름은 김영희야.」→ mother + name
- 「김철수는 내 아빠야.」→ father + name
- 「엄마 이름 뭐였지?」→ recall
- 「가족 관계 목록」→ list
- 「엄마 기억에서 지워줘」→ delete

## Module

`src/relationship/` — catalog, parse, storage, service. Core Brain skill: `relationship`.

Does not invent names. Phone/address/medical history are not stored by this skill.
