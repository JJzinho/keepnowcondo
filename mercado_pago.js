fetch('https://api.mercadopago.com/preapproval_plan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer TEST-7010832792903159-070711-fb06e9423ee11fccb91cd939dde3e7e3-2532487401'
  },
  body: JSON.stringify({
    reason: "Plano orgânico do KeepNow Condo",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      repetitions: 12,
      billing_day: 10,
      billing_day_proportional: false,
      free_trial: {
        frequency: 1,
        frequency_type: "months"
      },
      transaction_amount: 10,
      currency_id: "BRL"
    },
    payment_methods_allowed: {
      payment_types: [{ id: "credit_card" }],
      payment_methods: [{ id: "bolbradesco" }]
    },
    back_url: "https://www.keepnow.com.br/www/pages/cadastro.html"
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Erro:', error));
