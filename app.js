//Carregando módulos
const express = require('express');
const { engine } = require('express-handlebars');
const bodyParser = require('body-parser');
const app = express();
const admin = require('./routes/admin')
const usuarios = require('./routes/usuario')
const path = require('path')
const mongoose = require('mongoose');
const session = require("express-session")
const flash = require("connect-flash");
require('./models/Postagem')
const Postagem = mongoose.model("postagens")
require('./models/Categoria')
const Categoria = mongoose.model("categorias")
const dotenv = require('dotenv')
dotenv.config()
const MONGO_URL = process.env.MONGO_URL
const passport = require('passport');
require('./config/auth')(passport)
// Configurações
// Session
app.use(session({
    secret: "cursodenode",
    resave: true,
    saveUninitialized: true
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())

// Middleware
app.use((req, res, next) => {
    res.locals.success_msg = req.flash("success_msg")
    res.locals.error_msg = req.flash("error_msg")
    res.locals.error = req.flash("error")
    res.locals.user = req.user || null
    res.locals.userAdmin = req.user && req.user.isAdmin == 1 ? req.user : null
    next()
})

// Body Parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Handlebars
app.engine('handlebars', engine({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');


// Mongoose
mongoose.connect(MONGO_URL).then(() => {
    console.log("Conectado ao banco.")
}).catch((err) => {
    console.log("Erro ao conectar: " + err)
})
//
// Public
app.use(express.static(path.join(__dirname, 'public')))

// Rotas
app.get('/', (req, res) => {
    Postagem.find().populate("categoria").sort({ data: "desc" }).lean().then((postagens) => {
        res.render('index', { postagens: postagens })
    }).catch((err) => {
        req.flash('error_msg', 'Houve um erro interno')
        res.redirect('/404')
    })
})

app.get('/postagem/:slug', (req, res) => {
    Postagem.findOne({ slug: req.params.slug }).then((postagem) => {
        if (postagem) {
            const post = {
                titulo: postagem.titulo,
                categoria: postagem.categoria,
                data: postagem.data,
                conteudo: postagem.conteudo
            }
            res.render('postagem/index', { post: post })
        } else {
            req.flash('error_msg', 'Essa postagem não existe.')
            res.redirect("/")
        }
    }).catch((err) => {
        req.flash('error_msg', 'Houve um erro interno')
        res.redirect("/")
    })
})

app.get('/categorias', (req, res) => {
    Categoria.find().lean().then((categorias) => {
        res.render('categorias/index', { categorias: categorias })
    }).catch((err) => {
        req.flash('error_msg', 'Houve um erro interno')
        res.redirect("/")
    })
})

app.get('/categorias/:slug', (req, res) => {
    Categoria.findOne({ slug: req.params.slug }).lean().then((categoria) => {
        if (categoria) {
            Postagem.find({ categoria: categoria._id }).lean().then((postagens) => {
                res.render('categorias/postagens', {postagens: postagens, categoria: categoria})
            }).catch((err) => {
                req.flash('error_msg', 'Houve um erro ao listar os posts.')
                res.redirect("/")
            })
        } else {
            req.flash('error_msg', 'Esta categoria não existe.')
            res.redirect("/")
        }
    }).catch((err) => {
        req.flash('error_msg', 'Houve um erro interno ao carregar essa categoria.')
        res.redirect("/")
    })
})

app.get('/404', (req, res) => {
    res.send('Erro 404!')
})

app.get('/posts', (req, res) => {
    res.send('Lista posts')
})

app.use('/admin', admin)
app.use('/usuarios', usuarios)

// Outros   
const PORT = 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando na porta 3000!")
})

