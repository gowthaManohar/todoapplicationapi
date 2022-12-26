var format = require("date-fns/format");
var isValid = require("date-fns/isValid");

const express = require("express");
const app = express();
app.use(express.json());
var addDays = require("date-fns/addDays");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbpath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializationDbAndServer = async () => {
  try {
    db = await open({ filename: dbpath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`db error ${e.message}`);
    process.exit(1);
  }
};
initializationDbAndServer();

const todoobject = (todo) => {
  return {
    id: todo.id,
    todo: todo.todo,
    priority: todo.priority,
    status: todo.status,
    category: todo.category,
    dueDate: todo.due_date,
  };
};

//get api1
app.get("/todos/", async (request, response) => {
  const { status, priority, search_q, category, date } = request.query;

  if (
    !(
      status === "TO DO" ||
      status === "IN PROGRESS" ||
      status === "DONE" ||
      status === undefined
    )
  ) {
    response.status(400);
    return response.send("Invalid Todo Status");
  }
  if (
    !(
      priority === "HIGH" ||
      priority === "MEDIUM" ||
      priority === "LOW" ||
      priority === undefined
    )
  ) {
    response.status(400);
    return response.send("Invalid Todo Priority");
  }
  if (
    !(
      category === "WORK" ||
      category === "HOME" ||
      category === "LEARNING" ||
      category === undefined
    )
  ) {
    response.status(400);
    return response.send("Invalid Todo Category");
  }

  const query = `SELECT * FROM todo
    WHERE
    (status = '${status}') OR (priority = '${priority}') OR
    (priority = '${priority}' AND status = '${status}')
    OR (todo LIKE '%${search_q}%') OR 
    (category = '${category}' AND status='${status}')
    OR (category = '${category}')OR
    (category ='${category}' AND priority='${priority}');`;
  const dbresponse = await db.all(query);
  response.send(dbresponse.map((todo) => todoobject(todo)));
});

//API2 GET BASED ON ID

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const query = `SELECT * FROM todo WHERE id = ${todoId};`;
  const dbresponse = await db.get(query);
  response.send(todoobject(dbresponse));
});

//api 3 get

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  var frmtdate = format(new Date(request.query.date), "yyyy-MM-dd");
  let result = isValid(new Date(frmtdate));
  if (request.query.date !== frmtdate) {
    response.status(400);
    return response.send("Invalid Due Date");
  }
  const query = `SELECT * FROM todo 
  WHERE 
  due_date = ${frmtdate};`;
  const dbresponse = await db.all(query);
  console.log(dbresponse);
  console.log(frmtdate);
  response.send(dbresponse.map((todo) => todoobject(todo)));
});

//api post
app.post("/todos/", async (request, response) => {
  const { id, todo, category, priority, status, dueDate } = request.body;
  if (!(status === "TO DO" || status === "IN PROGRESS" || status === "DONE")) {
    response.status(400);
    return response.send("Invalid Todo Status");
  }
  if (!(priority === "HIGH" || priority === "MEDIUM" || priority === "LOW")) {
    response.status(400);
    return response.send("Invalid Todo Priority");
  }
  if (
    !(category === "WORK" || category === "HOME" || category === "LEARNING")
  ) {
    response.status(400);
    return response.send("Invalid Todo Category");
  }
  let frmtdate = format(new Date(dueDate), "yyyy-MM-dd");
  let result = isValid(new Date(dueDate));
  //console.log(result);
  if (frmtdate !== request.body.dueDate) {
    response.status(400);
    return response.send("Invalid Due Date");
  }
  const query = `INSERT INTO 
  todo (id,todo,category,priority,status,due_date)
  VALUES(${id},'${todo}','${category}','${priority}','${status}','${dueDate}');`;

  const dbresponse = await db.run(query);
  console.log(dbresponse);
  return response.send("Todo Successfully Added");
});

//api5
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let requestdata = request.body;

  let updatecolumn = "";
  switch (true) {
    case requestdata.status !== undefined:
      updatecolumn = "Status";
      break;
    case requestdata.priority !== undefined:
      updatecolumn = "Priority";
      break;
    case requestdata.todo !== undefined:
      updatecolumn = "Todo";
      break;
    case requestdata.category !== undefined:
      updatecolumn = "Category";
      break;
    case requestdata.dueDate !== undefined:
      updatecolumn = "Due Date";
      break;
  }

  if (request.body.dueDate !== undefined) {
    let frmtdate = format(new Date(request.body.dueDate), "yyyy-MM-dd");
    if (frmtdate !== request.body.dueDate) {
      response.status(400);
      return response.send("Invalid Due Date");
    }
  }
  const queryfortodo = `SELECT * FROM todo WHERE 
id = ${todoId};`;
  const gettodo = await db.get(queryfortodo);
  const {
    status = gettodo.status,
    priority = gettodo.priority,
    todo = gettodo.todo,
    category = gettodo.category,
    dueDate = gettodo.due_date,
  } = request.body;

  if (!(status === "TO DO" || status === "IN PROGRESS" || status === "DONE")) {
    response.status(400);
    return response.send("Invalid Todo Status");
  }
  if (!(priority === "HIGH" || priority === "MEDIUM" || priority === "LOW")) {
    response.status(400);
    return response.send("Invalid Todo Priority");
  }
  if (
    !(category === "WORK" || category === "HOME" || category === "LEARNING")
  ) {
    response.status(400);
    return response.send("Invalid Todo Category");
  }

  const updatequery = `UPDATE todo 
SET status = '${status}',
priority='${priority}',todo = '${todo}',
category = '${category}',due_date=${dueDate}
WHERE 
id = ${todoId};`;
  const dbresponse = await db.run(updatequery);
  console.log(dbresponse);
  response.send(`${updatecolumn} Updated`);
});

//api 6 delete
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const query = `DELETE FROM todo WHERE id = ${todoId};`;
  const dbresponse = await db.run(query);
  response.send("Todo Deleted");
});

module.exports = app;
