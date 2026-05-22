const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const fs = require("fs").promises;

const app = express();
const port = 3000;

const db = new sqlite3.Database("./database/essentials.db");
let latestResults = null;

const initializeDatabase = async () => {
  try {
    db.serialize(() => {
      // Tabela de questões para Simulado 1
      db.run("DROP TABLE IF EXISTS questions1", (err) => {
        if (err) console.error("Erro ao dropar tabela questions1:", err);
      });
      db.run("CREATE TABLE questions1 (id INTEGER PRIMARY KEY, question TEXT, options TEXT, answer TEXT)", (err) => {
        if (err) console.error("Erro ao criar tabela questions1:", err);
      });

      fs.readFile("./data/questions.json", "utf8")
        .then((data) => {
          const questions = JSON.parse(data);
          const stmt = db.prepare("INSERT INTO questions1 (question, options, answer) VALUES (?, ?, ?)");
          questions.forEach((q) => {
            stmt.run(q.question, JSON.stringify(q.options), q.answer);
          });
          stmt.finalize(() => {
            console.log("Tabela de questões do Simulado 1 reiniciada e preenchida a partir de questions.json.");
          });
        })
        .catch((err) => console.error("Erro ao ler questions.json:", err));

      // Tabela de questões para Simulado 2
      db.run("DROP TABLE IF EXISTS questions2", (err) => {
        if (err) console.error("Erro ao dropar tabela questions2:", err);
      });
      db.run("CREATE TABLE questions2 (id INTEGER PRIMARY KEY, question TEXT, options TEXT, answer TEXT)", (err) => {
        if (err) console.error("Erro ao criar tabela questions2:", err);
      });

      fs.readFile("./data/questions2.json", "utf8")
        .then((data) => {
          const questions = JSON.parse(data);
          const stmt = db.prepare("INSERT INTO questions2 (question, options, answer) VALUES (?, ?, ?)");
          questions.forEach((q) => {
            stmt.run(q.question, JSON.stringify(q.options), q.answer);
          });
          stmt.finalize(() => {
            console.log("Tabela de questões do Simulado 2 reiniciada e preenchida a partir de questions2.json.");
          });
        })
        .catch((err) => console.error("Erro ao ler questions2.json:", err));

      // Tabela de administradores
      db.run("DROP TABLE IF EXISTS admins", (err) => {
        if (err) console.error("Erro ao dropar tabela admins:", err);
      });
      db.run("CREATE TABLE admins (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)", (err) => {
        if (err) console.error("Erro ao criar tabela admins:", err);
        else {
          const adminStmt = db.prepare("INSERT INTO admins (username, password) VALUES (?, ?)");
          const saltRounds = 10;
          bcrypt.hash("admin123", saltRounds, (err, hash) => {
            if (err) console.error("Erro ao criar hash da senha:", err);
            else {
              adminStmt.run("admin", hash, (err) => {
                if (err) console.error("Erro ao inserir usuário admin:", err);
                else console.log("Tabela de administradores reiniciada e usuário padrão inserido (admin/admin123).");
              });
              adminStmt.finalize();
            }
          });
        }
      });

      // Tabela de submissões
      db.run("DROP TABLE IF EXISTS submissions", (err) => {
        if (err) console.error("Erro ao dropar tabela submissions:", err);
      });
      db.run("CREATE TABLE submissions (id INTEGER PRIMARY KEY, timestamp TEXT, correctAnswers INTEGER, simulado TEXT)", (err) => {
        if (err) console.error("Erro ao criar tabela submissions:", err);
        else console.log("Tabela de submissões criada.");
      });
    });
  } catch (err) {
    console.error("Erro ao inicializar o banco de dados:", err);
  }
};

initializeDatabase();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const session = require("express-session");
app.use(session({
  secret: "your-secret-key",
  resave: false,
  saveUninitialized: false,
}));

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.authenticated) return next();
  res.redirect("/login");
};

app.get("/", (req, res) => {
  res.render("index", {});
});

// Simulado 1
app.get("/essentials", (req, res) => {
  db.all("SELECT * FROM questions1 ORDER BY RANDOM()", (err, questions) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Erro ao acessar o banco de dados.");
    }
    res.render("essentials", {
      questions: questions,
      initialQuestionIndex: 0,
    });
  });
});

// Simulado 2
app.get("/essentials2", (req, res) => {
  db.all("SELECT * FROM questions2 ORDER BY RANDOM()", (err, questions) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Erro ao acessar o banco de dados.");
    }
    res.render("essentials2", {
      questions: questions,
      initialQuestionIndex: 0,
    });
  });
});

app.post("/eresult", (req, res) => {
  const { questions, userAnswers } = req.body;

  const results = questions.map((q, index) => {
    const correctAnswers = q.answer.split(", ").map(ans => ans.trim());
    const userAnswerArray = Array.isArray(userAnswers[index]) ? userAnswers[index] : [userAnswers[index] || "Não respondida"];
    
    const isCorrect = correctAnswers.length === userAnswerArray.length &&
                      correctAnswers.every(ans => userAnswerArray.includes(ans)) &&
                      userAnswerArray.every(ans => correctAnswers.includes(ans));

    return {
      question: q.question,
      correct: q.answer,
      userAnswer: userAnswerArray.join(", "),
      isCorrect: isCorrect
    };
  });

  let correctAnswers = 0;
  results.forEach((result) => {
    if (result.isCorrect) correctAnswers++;
  });

  latestResults = {
    answers: results,
    correctAnswers: correctAnswers,
    totalQuestions: questions.length,
    percentage: (correctAnswers / questions.length) * 100,
  };

  const simulado = questions[0].id <= 54 ? "Simulado 1" : "Simulado 2"; // Identifica o simulado pelo ID (simplificação)
  db.run("INSERT INTO submissions (timestamp, correctAnswers, simulado) VALUES (?, ?, ?)", 
    [new Date().toISOString(), correctAnswers, simulado], 
    (err) => {
      if (err) console.error("Erro ao salvar submissão:", err);
      else console.log("Submissão registrada para", simulado);
    });

  res.json({ success: true });
});

app.get("/eresult", (req, res) => {
  if (!latestResults) {
    res.render("error", {
      message: "Nenhum resultado disponível. Parece que você ainda não fez o simulado!",
      redirectText: "Voltar ao Início",
      redirectUrl: "/",
      retryUrl: "/select",
    });
  } else {
    res.render("eresult", latestResults);
  }
});

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM admins WHERE username = ?", [username], (err, row) => {
    if (err) return res.render("login", { error: "Erro no servidor. Tente novamente." });
    if (!row) return res.render("login", { error: "Usuário ou senha inválidos." });

    bcrypt.compare(password, row.password, (err, match) => {
      if (err) return res.render("login", { error: "Erro ao verificar credenciais." });
      if (match) {
        req.session.authenticated = true;
        res.redirect("/management");
      } else {
        res.render("login", { error: "Usuário ou senha inválidos." });
      }
    });
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get("/management", isAuthenticated, (req, res) => {
  db.get("SELECT COUNT(*) as questionCount1 FROM questions1", (err, row1) => {
    if (err) return res.status(500).send("Erro ao consultar questões do Simulado 1.");
    db.get("SELECT COUNT(*) as questionCount2 FROM questions2", (err, row2) => {
      if (err) return res.status(500).send("Erro ao consultar questões do Simulado 2.");
      db.all("SELECT correctAnswers, simulado FROM submissions", (err, submissions) => {
        if (err) return res.status(500).send("Erro ao consultar submissões.");

        // Separar submissões por simulado
        const submissions1 = submissions.filter(sub => sub.simulado === "Simulado 1");
        const submissions2 = submissions.filter(sub => sub.simulado === "Simulado 2");

        // Métricas do Simulado 1
        const submissionCount1 = submissions1.length;
        const totalCorrect1 = submissions1.reduce((sum, sub) => sum + sub.correctAnswers, 0);
        const avgCorrect1 = submissionCount1 > 0 ? (totalCorrect1 / submissionCount1).toFixed(2) : 0;
        const passingCount1 = submissions1.filter(sub => sub.correctAnswers >= 38).length;
        const approvalRate1 = submissionCount1 > 0 ? ((passingCount1 / submissionCount1) * 100).toFixed(2) : 0;
        const distribution1 = {
          low: submissions1.filter(sub => sub.correctAnswers <= 20).length,
          medium: submissions1.filter(sub => sub.correctAnswers > 20 && sub.correctAnswers < 38).length,
          high: submissions1.filter(sub => sub.correctAnswers >= 38).length
        };

        // Métricas do Simulado 2
        const submissionCount2 = submissions2.length;
        const totalCorrect2 = submissions2.reduce((sum, sub) => sum + sub.correctAnswers, 0);
        const avgCorrect2 = submissionCount2 > 0 ? (totalCorrect2 / submissionCount2).toFixed(2) : 0;
        const passingCount2 = submissions2.filter(sub => sub.correctAnswers >= 38).length;
        const approvalRate2 = submissionCount2 > 0 ? ((passingCount2 / submissionCount2) * 100).toFixed(2) : 0;
        const distribution2 = {
          low: submissions2.filter(sub => sub.correctAnswers <= 20).length,
          medium: submissions2.filter(sub => sub.correctAnswers > 20 && sub.correctAnswers < 38).length,
          high: submissions2.filter(sub => sub.correctAnswers >= 38).length
        };

        res.render("management", {
          questionCount1: row1.questionCount1,
          questionCount2: row2.questionCount2,
          submissionCount1: submissionCount1,
          submissionCount2: submissionCount2,
          avgCorrect1: avgCorrect1,
          avgCorrect2: avgCorrect2,
          approvalRate1: approvalRate1,
          approvalRate2: approvalRate2,
          distribution1: distribution1,
          distribution2: distribution2
        });
      });
    });
  });
});

app.get("/select", (req, res) => {
  res.render("select", {});
})

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}!`);
});