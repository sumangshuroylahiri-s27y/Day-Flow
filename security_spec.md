# DAYFLOW Firestore Security Specification

## 1. Data Invariants
- All user data lives under `/users/{userId}` and its subcollections (`/tasks`, `/events`, `/transactions`, `/budgets`, `/savingsGoals`, `/notes`, `/habits`, `/habitRecords`, `/focusSessions`, `/goals`, `/notifications`, `/aiConversations`).
- Only the authenticated owner (`request.auth.uid == userId` with verified email) can read, list, create, update, or delete their own documents.
- Document IDs must match `^[a-zA-Z0-9_\\-]+$` and have length `<= 128`.
- `userId` / `uid` fields in subcollection payloads must strictly equal `userId` and `request.auth.uid`, and are immutable after creation.
- `createdAt` is immutable and validated against `request.time` on create; `updatedAt` is validated against `request.time` on create and update.
- All strings enforce explicit `.size()` limits; all arrays enforce `.size() <= MAX` limits; all enums enforce explicit allowlists.
- Shadow fields and unapproved keys are rejected via `keys().hasAll(...)` + `keys().hasOnly(...)` on create and `affectedKeys().hasOnly(...)` on update.

## 2. Adversarial "Dirty Dozen" Payloads
1. **Cross-user read**: User B attempts `get` on `/users/userA/tasks/task1` -> `PERMISSION_DENIED`.
2. **Cross-user list**: User B attempts `list` on `/users/userA/transactions` -> `PERMISSION_DENIED`.
3. **Unauthenticated write**: Unauthenticated client attempts `create` on `/users/userA/notes/note1` -> `PERMISSION_DENIED`.
4. **UID spoofing on create**: User A creates `/users/userA/tasks/t1` with `userId: "userB"` -> `PERMISSION_DENIED`.
5. **Shadow field injection on create**: User A creates `/users/userA/tasks/t1` with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
6. **Shadow field injection on update**: User A updates `/users/userA/tasks/t1` adding `ghostField: "hack"` -> `PERMISSION_DENIED`.
7. **ID poisoning**: User A attempts `create` on `/users/userA/tasks/bad$id/../../../etc` or 500-char ID -> `PERMISSION_DENIED`.
8. **Immutable userId tampering**: User A updates `/users/userA/tasks/t1` attempting to change `userId` -> `PERMISSION_DENIED`.
9. **Immutable createdAt tampering**: User A updates `/users/userA/notes/n1` attempting to alter `createdAt` -> `PERMISSION_DENIED`.
10. **Oversized string DoW attack**: User A creates `/users/userA/tasks/t1` with a 50,000-character `title` -> `PERMISSION_DENIED`.
11. **Invalid enum value**: User A creates `/users/userA/tasks/t1` with `priority: "super_ultra"` -> `PERMISSION_DENIED`.
12. **Unbounded array attack**: User A creates `/users/userA/tasks/t1` with 200 `tags` -> `PERMISSION_DENIED`.
