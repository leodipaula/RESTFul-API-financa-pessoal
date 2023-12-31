const pool = require('../banco_de_dados/conexao');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const senhaSegura = require('../chavesecreta');

const cadastrarUsuario = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ mensagem: "O preenchimento de todos os campos são obrigatórios." });
        }

        const usuarioExistente = await pool.query(
            'select * from usuarios where email = $1', [email]
        );

        if (usuarioExistente.rowCount > 0) {
            return res.status(400).json({ mensagem: "já existe email cadastrado." });
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        const novoUsuario = await pool.query(
            'insert into usuarios (nome, email, senha) values ($1, $2, $3) returning *',
            [nome, email, senhaCriptografada]
        );

        return res.status(201).json(novoUsuario.rows[0]);
    } catch (error) {
        return res.status(400).json({ mensagem: error.message });
    }
}

const fazerLogin = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ mensagem: "O preenchimento de todos os campos são obrigatórios." });
        }

        const usuarioExistente = await pool.query(
            'select * from usuarios where email = $1', [email]
        );

        if (usuarioExistente.rowCount < 1) {
            return res.status(401).json({ mensagem: "Email ou senha informados são inválidos." });
        }

        if (!await bcrypt.compare(senha, usuarioExistente.rows[0].senha)) {
            return res.status(401).json({ mensagem: 'E-mail ou senha informados são inválidos.' })
        }

        const { senha: _, ...usuario } = usuarioExistente.rows[0];

        const token = jwt.sign(usuario, senhaSegura, { 'expiresIn': '2h' });

        return res.status(200).json({
            usuario,
            token
        });
    } catch (error) {
        return res.status(500).json({ mensagem: error.message });
    }
}

const detalharUsuario = async (req, res) => {
    try {
        return res.json(req.usuario);
    } catch (error) {
        return res.status(500).json({ mensagem: error.message });
    }
}

const atualizarUsuario = async (req, res) => {
    try {
        const { id } = req.usuario;
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ mensagem: "O preenchimento de todos os campos são obrigatórios." });
        }

        const emailJaExistente = await pool.query(
            'select * from usuarios where email = $1 and id <> $2', [email, id]
        );

        if (emailJaExistente.rowCount > 0) {
            return res.status(400).json({ mensagem: "Esse email já pertence a outro usuário." })
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        await pool.query(
            'update usuarios set nome = $1, email = $2, senha = $3 where id = $4',
            [nome, email, senhaCriptografada, id]
        );

        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ mensagem: error.message });
    }
}

module.exports = {
    cadastrarUsuario,
    fazerLogin,
    detalharUsuario,
    atualizarUsuario
}