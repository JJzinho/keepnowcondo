const express = require('express');
const mercadopago = require('mercadopago');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configure seu Access Token (sandbox ou produção)
mercadopago.configure({
  access_token: '2532487401'
});

app.post('/criar-preferencia', async (req, res) => {
  try {
    const preference = {
      items: [
        {
          title: req.body.title || 'Produto Teste',
          quantity: req.body.quantity || 1,
          unit_price: req.body.unit_price || 100
        }
      ],
      back_urls: {
        success: 'https://seusite.com/sucesso',
        failure: 'https://seusite.com/falha',
        pending: 'https://seusite.com/pendente'
      },
      auto_return: 'approved'
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.init_point });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
