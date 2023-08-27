require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
mongoose
  .connect(
    `mongodb+srv://aayush:${process.env.password}@mernstack.zncrf9f.mongodb.net/kalvium`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  console.log(req.path, req.method);
  next();
});

const operationSchema = new mongoose.Schema(
  {
    question: String,
    answer: Number,
  },
  { timestamps: true }
);

const Operation = mongoose.model("Operation", operationSchema);

app.use(express.json());
app.use(cors());

const samples = [
  { path: "/5/plus/3", question: "5+3", answer: 8 },
  { path: "/3/minus/5", question: "3-5", answer: -2 },
  { path: "/3/minus/5/plus/8", question: "3-5+8", answer: 6 },
  { path: "/3/into/5/plus/8/into/6", question: "3*5+8*6", answer: 63 },
];

function generateSampleRows() {
  let rows = "";
  samples.forEach((sample) => {
    rows += `<tr><td>${sample.path}</td><td>${sample.question}</td><td>${sample.answer}</td></tr>`;
  });
  return rows;
}
app.get("/", (req, res) => {
  let html = `
    <h1>GET Endpoint Samples</h1>
    <table border="1" bgcolor=#c1a99e>
      <thead>
        <tr>
          <th>Endpoint</th>
          <th>Question</th>
          <th>Answer</th>
        </tr>
      </thead>
      <tbody>
        ${generateSampleRows()}
      </tbody>
    </table>
  `;
  res.send(html);
});

app.get("/history", async (req, res) => {
  try {
    const history = await Operation.find().limit(20).sort({ createdAt: -1 });
    let html = "<body bgcolor=#c1a99e><h1>Operation History</h1>";
    html +=
      '<table style="border-collapse: collapse; width: 50%; margin: 0 auto; text-align: center;">';
    html +=
      '<tr style="background-color: #A9A9A9;"><th style="padding: 10px; border: 1px solid #dddddd;">Question</th><th style="padding: 10px; border: 1px solid #dddddd;">Answer</th></tr>';

    history.forEach((sample) => {
      html += `<tr><td style="padding: 8px; border: 1px solid #dddddd;">${sample.question}</td><td style="padding: 8px; border: 1px solid #dddddd;">${sample.answer}</td></tr>`;
    });

    html += "</table></body>";
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: "Error fetching history" });
  }
});

function performOperation(operand1, operator, operand2) {
  switch (operator) {
    case "plus":
      return operand1 + operand2;
    case "minus":
      return operand1 - operand2;
    case "into":
      return operand1 * operand2;
    case "by":
      return operand1 / operand2;
    default:
      throw new Error("Invalid operator.");
  }
}

function applyBodmasRule(calculationArray) {
  const precedence = {
    into: 2,
    by: 2,
    plus: 1,
    minus: 1,
  };

  const outputStack = [];
  const operatorStack = [];

  for (const token of calculationArray) {
    if (typeof token === "number") {
      outputStack.push(token);
    } else if (Object.keys(precedence).includes(token)) {
      while (
        operatorStack.length > 0 &&
        precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]
      ) {
        const operator = operatorStack.pop();
        const operand2 = outputStack.pop();
        const operand1 = outputStack.pop();
        const result = performOperation(operand1, operator, operand2);
        outputStack.push(result);
      }
      operatorStack.push(token);
    }
  }

  while (operatorStack.length > 0) {
    const operator = operatorStack.pop();
    const operand2 = outputStack.pop();
    const operand1 = outputStack.pop();
    const result = performOperation(operand1, operator, operand2);
    outputStack.push(result);
  }

  return outputStack[0];
}
app.get("/:calculation(*)", async (req, res) => {
  const calculation = req.params.calculation;
  const segments = calculation.split("/");
  const calculationArray = [];
  for (const segment of segments) {
    if (!isNaN(segment)) {
      calculationArray.push(parseFloat(segment));
    } else {
      calculationArray.push(segment);
    }
  }
  if (!Array.isArray(calculationArray) || calculationArray.length < 3) {
    return res
      .status(400)
      .json({ error: "Input should be an array of at least length 3." });
  }
  const result = applyBodmasRule(calculationArray);
  const operators = {
    into: "*",
    plus: "+",
    minus: "-",
    by: "/",
  };

  let expression = "";
  for (const item of calculationArray) {
    if (item in operators) {
      expression += operators[item];
    } else {
      expression += item;
    }
  }
  const operation = new Operation({
    question: expression,
    answer: result,
  });

  try {
    await operation.save();
    res.json({ question: expression, answer: result });
  } catch (error) {
    res.status(500).json({ error: "Error saving operation" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running`);
});