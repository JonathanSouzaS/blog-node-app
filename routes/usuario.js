const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")
require("../models/Usuario")
const Usuario = mongoose.model("usuarios")
const bcrypt = require("bcryptjs")
const passport = require('passport');
const { isAdmin } = require('../helpers/isAdmin');
const { isAuthenticated } = require('../helpers/isAuthenticated');
const multer = require('multer')
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner")
const dotenv = require('dotenv')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const crypto = require('crypto')
const sharp = require('sharp')
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 60 });

dotenv.config()
const bucketName = process.env.BUCKET_NAME
const bucketRegion = process.env.BUCKET_REGION
const bucketAccessKey = process.env.BUCKET_ACCESS_KEY
const bucketAccessSecret = process.env.BUCKET_ACCESS_SECRET

const s3 = new S3Client({
    credentials: {
        accessKeyId: bucketAccessKey,
        secretAccessKey: bucketAccessSecret,
    },
    region: bucketRegion
})

const randomImageName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex')

upload.single('image')

router.get('/registro', (req, res) => {
    res.render('usuarios/registro')
})

router.get('/registroAdmin', isAdmin, (req, res) => {
    res.render('usuarios/registro', { req: req })
})

router.get('/index', isAdmin, (req, res) => {
    Usuario.find().sort({ isAdmin: 'desc', nome: 'asc' }).lean().then(async (usuarios) => {

        for (const usuario of usuarios) {
            if (usuario.imagem) {
                const getObjectParams = {
                    Bucket: bucketName,
                    Key: usuario.imagem,
                };
                const command = new GetObjectCommand(getObjectParams);
                const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
                usuario.url = url;
            } else {
                usuario.url = null;
            }
        }

        res.render('usuarios/index', { usuarios: usuarios })
    }).catch((erro) => {
        req.flash('erro_msg', 'Houve um erro ao listar os usuários.')
        console.log(erro)
        res.redirect('/admin')
    })
})

router.get('/editProfileImage', isAuthenticated, (req, res) => {
    res.render('usuarios/editProfileImage')
})

router.post('/editProfileImage', isAuthenticated, upload.single('imagem'), async (req, res) => {
    if (req.body == null) {
        res.redirect('/usuarios/')
    }

    if (req.user.imagem) {
        const deleteImageParams = {
            Bucket: bucketName,
            Key: req.user.imagem
        }

        const deleteOldImageCommand = new DeleteObjectCommand(deleteImageParams)
        await s3.send(deleteOldImageCommand).catch((err) => {
            console.log(err)
            req.flash('error_msg', 'Houve um erro ao editar o perfil.')
            res.redirect('/usuarios/meuPerfil')
        })
    }

    // const buffer = await sharp(req.file.buffer).resize({ width: 500, height: 500, fit: "contain" }).toBuffer()
    const imageName = randomImageName()
    const params = {
        Bucket: bucketName,
        Key: imageName,
        Body: req.file.buffer /*buffer*/,
        ContentType: req.file.mimetype
    }

    const command = new PutObjectCommand(params)

    await s3.send(command)

    Usuario.findOne({ _id: req.user._id }).then((usuario) => {

        usuario.imagem = imageName

        usuario.save().then(() => {
            req.flash('success_msg', 'Imagem de perfil alterada com sucesso.')
            res.redirect('/usuarios/meuPerfil')
        }).catch((err) => {
            console.log(err)
            req.flash('error_msg', 'Houve um erro ao alterar a imagem de perfil.')
            res.redirect('/usuarios/meuPerfil')
        })

    }).catch((err) => {
        console.log(err)
        req.flash('error_msg', 'Houve um erro ao alterar a imagem de perfil.')
        res.redirect('/usuarios/meuPerfil')
    })
})

router.get('/meuPerfil', isAuthenticated, async (req, res) => {
    const cached = myCache.get("usuario");
    if (cached) return res.render('usuarios/meuPerfil', { usuario: cached })

    const usuarioCache = await Usuario.findOne({ _id: req.user._id }).lean().then(async (usuario) => {
        if (usuario.imagem) {
            const getObjectParams = {
                Bucket: bucketName,
                Key: usuario.imagem,
            };
            const command = new GetObjectCommand(getObjectParams);
            const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
            usuario.url = url;
        } else {
            usuario.url = null;
        }

        myCache.set("usuario", usuario);

        res.render('usuarios/meuPerfil', { usuario: usuario })
    }).then(() => {
         myCache.set("usuario", usuarioCache)
    }).catch((erro) => {
        req.flash('erro_msg', 'Houve um erro ao listar os usuários.')
        console.log(erro)
        res.redirect('/admin')
    })
})

router.post('/registro', (req, res) => {
    const erros = []

    if (!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null) {
        erros.push({ texto: "Nome inválido!" })
    }

    if (!req.body.email || typeof req.body.email == undefined || req.body.email == null) {
        erros.push({ texto: "E-mail inválido!" })
    }

    if (!req.body.senha || typeof req.body.senha == undefined || req.body.senha == null) {
        erros.push({ texto: "Senha inválido!" })
    }

    if (req.body.senha.length < 4) {
        erros.push({ texto: "Senha muito curta!" })
    }

    if (req.body.senha != req.body.senha2) {
        erros.push({ texto: "As senhas são diferentes, tente novamente!" })
    }

    if (erros.length > 0) {
        res.render('usuarios/registro', { erros: erros })
    } else {
        Usuario.findOne({ email: req.body.email }).then((usuario) => {
            if (usuario) {
                req.flash('error_msg', "Já existe uma conta com esse e-mail.")
                res.redirect('/usuarios/registro')
            } else {
                var novoUsuario = null
                if (req.user && req.user.isAdmin == true) {
                    novoUsuario = new Usuario({
                        nome: req.body.nome,
                        email: req.body.email,
                        senha: req.body.senha,
                        isAdmin: true
                    })
                } else {
                    novoUsuario = new Usuario({
                        nome: req.body.nome,
                        email: req.body.email,
                        senha: req.body.senha
                    })
                }

                bcrypt.genSalt(10, (erro, salt) => {
                    bcrypt.hash(novoUsuario.senha, salt, (erro, hash) => {
                        if (erro) {
                            req.flash('error_msg', 'Houve um erro ao criar um novo usuário.')
                            res.redirect('/')
                        }

                        novoUsuario.senha = hash

                        novoUsuario.save().then(() => {
                            req.flash('success_msg', 'Usuário salvo com sucesso')
                            res.redirect('/usuarios/login')
                        }).catch((err) => {
                            req.flash('error_msg', 'Houve um erro ao salvar um novo usuário.' + err)
                            res.redirect('/usuarios/registro')
                        })
                    })
                })
            }
        }).catch((err) => {
            req.flash('error_msg', "Houve um erro interno." + err)
            res.redirect('/')
        })
    }
})

router.post('/delete', isAuthenticated, (req, res) => {
    Usuario.findOne({ _id: req.body.id }).then((usuario) => {
        const params = {
            Bucket: bucketName,
            Key: usuario.imagem || null
        }

        const command = new DeleteObjectCommand(params)

        Usuario.deleteOne({ _id: req.body.id }).then(async () => {
            if (usuario.imagem) {
                await s3.send(command)
            }

            req.flash('success_msg', 'Usuário deletado com sucesso.')
            res.redirect('/usuarios/index')
        }).catch((err) => {
            console.log(err)
            req.flash('error_msg', 'Houve um erro ao deletar a imagem.')
            res.redirect('/usuarios/index')
        })
    }).catch((err) => {
        req.flash('error_msg', 'Houve um erro ao deletar o usuário.')
        res.redirect('/usuarios/index')
    })
})

router.get('/login', (req, res) => {
    res.render('usuarios/login')
})

router.get('/logout', (req, res, next) => {
    req.flash('success_msg', 'Logout feito com sucesso.')
    req.logout(function (err) {
        if (err) { return next(err) }
        res.redirect('/')
    })
})

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: "/",
        failureRedirect: "/usuarios/login",
        failureFlash: true
    })(req, res, next)
})




module.exports = router