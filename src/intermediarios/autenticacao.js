const jwt = require('jsonwebtoken');
const senhaSegura = require('../chavesecreta');
const pool = require('../banco_de_dados/conexao');

const verificarLogin = async (req, res, next) => {
    try {
        const { authorization } = req.headers;

        if (!authorization) {
            return res.status(401).json({
                mensagem: 'Para acessar este recurso um token de autenticação válido deve ser enviado.'
            });
        }

        const token = authorization.split(' ')[1];

        if (!token) {
            return res.status(401).json({ mensagem: "Você não possui autorização para acessar esse recurso." });
        }

        const assinatura = jwt.verify(token, senhaSegura);

        const { iat, exp, senha: _, ...usuario } = assinatura;

        const { rowCount } = await pool.query(
            'select * from usuarios where id = $1',
            [assinatura.id]
        );

        if (rowCount < 1) {
            return res.status(401).json({ mensagem: 'Você não possui autorização para acessar esse recurso.' });
        }

        req.usuario = usuario;

        next();
    } catch (error) {
        return res.status(401).json({ mensagem: error.message });
    }
}

module.exports = verificarLogin;