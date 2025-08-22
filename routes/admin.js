const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")
require("../models/Categoria")
const Categoria = mongoose.model("categorias")
require("../models/Postagem")
const Postagem = mongoose.model("postagens")
const {isAdmin} = require("../helpers/isAdmin")

router.get('/', isAdmin, (req, res) => {
    res.render("admin/index");
});

router.get('/posts', (req, res) => {
    res.send("Página de Posts");
});

router.get('/categorias', isAdmin, (req, res) => {
    Categoria.find().sort({ date: 'desc' }).lean().then((categorias) => {
        res.render('admin/categorias', { categorias: categorias })
    }).catch((erro) => {
        req.flash('erro_msg', 'Houve um erro ao listas as categorias.')
        console.log(erro)
        res.redirect('/admin')
    })
})

router.get('/categorias/add', isAdmin, (req, res) => {
    res.render("admin/addcategorias");
})

router.post('/categorias/nova', isAdmin, (req, res) => {

    var erros = []

    erros = validar(req, erros)

    if (erros.length > 0) {
        res.render("admin/addcategorias", { erros: erros })
    }
    else {
        const novaCategoria = {
            nome: req.body.nome,
            slug: req.body.slug
        }

        new Categoria(novaCategoria).save().then(() => {
            req.flash('success_msg', 'Categoria criada com sucesso!')
            res.redirect("/admin/categorias")
        }).catch(() => {
            req.flash('error_msg', 'Erro ao criar categoria. Tente novamente.')
            res.redirect("/admin")
        })
    }
});


router.get('/categorias/edit/:id', isAdmin, (req, res) => {
    Categoria.findOne({ _id: req.params.id }).lean().then((categoria) => {
        res.render("admin/editcategorias", { categoria: categoria })
    }).catch(() => {
        req.flash('error_msg', 'Esta categoria não existe.')
        res.redirect('/admin/categorias')
    })
})


router.post('/categorias/edit/:id', isAdmin, (req, res) => {
    var erros = []

    erros = validar(req, erros)

    if (erros.length > 0) {
        res.render("admin/addcategorias", { erros: erros })
    }
    else {
        Categoria.findOne({ _id: req.params.id }).lean().then((categoria) => {
            res.render("admin/editcategorias", { categoria: categoria })
        }).catch(() => {
            req.flash('error_msg', 'Esta categoria não existe.')
            res.redirect('/admin/categorias')
        })
    }
})

router.post('/categorias/edit', isAdmin, (req, res) => {
    Categoria.findOne({ _id: req.body.id }).then((categoria) => {

        categoria.nome = req.body.nome
        categoria.slug = req.body.slug

        categoria.save().then(() => {
            req.flash('success_msg', 'Categoria editada com sucesso!')
            res.redirect("/admin/categorias")
        })
    }).catch((err) => {
        req.flash('error_msg', 'Houve um erro ao editar a categoria.')
        console.log(err)
        res.redirect('/admin/categorias')
    })
})

router.post('/categorias/delete', isAdmin, (req, res) => {
    Categoria.deleteOne({ _id: req.body.id }).then(() => {
        req.flash('success_msg', 'Categoria deletada com sucesso.')
        res.redirect('/admin/categorias')
    }).catch((err) => {
        req.flash('error_msg', 'Houve um erro ao deletar a categoria.')
        console.log(err)
        res.redirect('/admin/categorias')
    })
})

router.get('/postagens', (req, res) => {
    Postagem.find().lean().populate("categoria").sort({ date: "desc" }).then((postagens) => {
        res.render('admin/postagens', { postagens: postagens });
    }).catch((erro) => {
        req.flash('error_msg', 'Houve um erro ao listar as postagens.')
        res.redirect('/admin')
    })
})

router.get('/postagens/add', isAdmin, (req, res) => {
    Categoria.find().lean().then((categorias) => {
        res.render("admin/addpostagens", { categorias: categorias })
    }).catch(() => {
        req.flash('error_msg', 'Houve um erro ao salvar a postagem.')
        res.redirect('/admin')
    })
})

router.post('/postagens/nova', isAdmin, (req, res) => {
    var erros = []

    if (req.body.categoria == "0") {
        erros.push({ texto: "Categoria inválida, registre uma categoria!" })
    }

    if (erros.length > 0) {
        res.render("admin/addpostagens", { erros: erros })
    } else {
        const novaPostagem = {
            titulo: req.body.titulo,
            descricao: req.body.descricao,
            conteudo: req.body.conteudo,
            categoria: req.body.categoria,
            slug: req.body.slug
        }

        new Postagem(novaPostagem).save().then(() => {
            req.flash('success_msg', 'Postagem criada com sucesso.')
            res.redirect("/admin/postagens")
        }).catch((err) => {
            console.log(err)
            req.flash('error_msg', 'Houve um erro durante o salvamento da postagem.')
            res.redirect("/admin/postagens")
        })
    }
})

router.get('/postagens/edit/:id', isAdmin, (req, res) => {
    Postagem.findOne({ _id: req.params.id }).lean().then((postagem) => {
        Categoria.find().lean().then((categorias) => {
            res.render("admin/editpostagens", { categorias: categorias, postagem: postagem })
        }).catch(() => {
            req.flash('error_msg', 'Erro ao carregar o formulário de edição.')
            res.redirect('/admin/postagens')
        })
    }).catch(() => {
        req.flash('error_msg', 'Erro ao carregar o formulário de edição.')
        res.redirect('/admin/postagens')
    })
})

router.post('/postagens/edit', isAdmin, (req, res) => {
    Postagem.findOne({ _id: req.body.id }).then((postagem) => {

        postagem.titulo = req.body.titulo,
            postagem.descricao = req.body.descricao,
            postagem.conteudo = req.body.conteudo,
            postagem.categoria = req.body.categoria,
            postagem.slug = req.body.slug

        postagem.save().then(() => {
            req.flash('success_msg', 'Postagem editada com sucesso!')
            res.redirect("/admin/postagens")
        })
    }).catch((err) => {
        req.flash('error_msg', 'Houve um erro ao editar a postagem.')
        res.redirect('/admin/postagens')
    })
})

router.get('/postagens/delete/:id', isAdmin, (req, res) => {
    Postagem.deleteOne({ _id: req.params.id }).then(() => {
        req.flash('success_msg', 'Postagem deletada com sucesso!')
        res.redirect('/admin/postagens')
    }).catch(() => {
        req.flash('error_msg', 'Houve um erro interno.')
        res.redirect('/admin/postagens')
    })
})

function validar(req, erros) {
    if (!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null) {
        erros.push({ texto: "Nome inválido" })
    }

    if (!req.body.slug || typeof req.body.slug == undefined || req.body.slug == null) {
        erros.push({ texto: "Slug inválido" })
    }

    if (req.body.nome.length < 2) {
        erros.push({ texto: "Nome muito curto" })
    }

    if (req.body.slug != req.body.slug.replace(/ /g, "")) {
        erros.push({ texto: "Slug Nao Pode Conter Espacos!" });
    }

    return erros
}

module.exports = router