# Blog API Example

A pre-generated blog backend showing User, Post, and Comment models.
Comments use opt-in routes (no `update` endpoint — intentional).

## Run it

```bash
npm install
npx prisma migrate dev --name init
npx ts-node generated/app.ts
```

Server starts on http://localhost:3001

## Schema used to generate this

```
User name:string email:string | Post title:string body?:string userId:int | Comment text:string postId:int userId:int --routes=create,list,get,delete
```

## Endpoints

| Model   | Routes available |
|---------|-----------------|
| User    | POST GET GET/:id PUT/:id DELETE/:id |
| Post    | POST GET GET/:id PUT/:id DELETE/:id |
| Comment | POST GET GET/:id DELETE/:id (no update — opt-in demo) |
