# backend/app.py (Mesmo código que o anterior, apenas para referência)
from flask import Flask, request, jsonify
from flask_cors import CORS
import mercadopago
import os
from supabase import create_client, Client
from datetime import datetime, timedelta 

app = Flask(__name__) 
CORS(app) 

# --- Configurações (OBTENHA ESSAS VARIÁVEIS DE AMBIENTE OU UM ARQUIVO DE CONFIG SEGURO) ---
MP_ACCESS_TOKEN = os.environ.get("MP_ACCESS_TOKEN", "SEU_ACCESS_TOKEN_DO_MERCADO_PAGO")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://SEU_ID_DO_PROJETO.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "SUA_CHAVE_SERVICE_ROLE_DO_SUPABASE")

# URLs de retorno do Mercado Pago (ajuste para as suas URLs reais do frontend)
FRONTEND_BASE_URL = "https://seusite.com/www/pages" 
SUCCESS_URL = f"{FRONTEND_BASE_URL}/inicio.html?payment_status=success" 
PENDING_URL = f"{FRONTEND_BASE_URL}/inicio.html?payment_status=pending"
FAILURE_URL = f"{FRONTEND_BASE_URL}/inicio.html?payment_status=failure"
# URL do seu webhook (onde o Mercado Pago vai enviar notificações)
WEBHOOK_URL = "https://api.seuservidor.com/mercadopago/webhook" 

# Inicializa o SDK do Mercado Pago
sdk = mercadopago.SDK(MP_ACCESS_TOKEN)

# Inicializa o cliente Supabase com a chave service_role (permissão total no backend)
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# --- ENDPOINT 1: Criar Preferência de Assinatura ---
@app.route("/mercadopago/create-subscription-preference", methods=["POST"])
def create_subscription_preference():
    try:
        data = request.get_json()
        user_id = data.get("userId")
        condo_id = data.get("condoId")
        plan_description = data.get("planDescription", "Assinatura Mensal KeepNow") 

        if not user_id or not condo_id:
            return jsonify({"message": "userId e condoId são obrigatórios"}), 400

        preference_data = {
            "items": [
                {
                    "title": plan_description,
                    "quantity": 1,
                    "unit_price": 99.90, 
                }
            ],
            "payer": {
                # Você pode preencher informações do pagador aqui se tiver os dados no backend
            },
            "external_reference": f"{user_id}-{condo_id}", 
            "back_urls": {
                "success": SUCCESS_URL,
                "pending": PENDING_URL,
                "failure": FAILURE_URL
            },
            "notification_url": WEBHOOK_URL,
            "auto_return": "approved", 
            "binary_mode": True, 
        }

        preference_response = sdk.preference().create(preference_data)
        preference = preference_response["response"]

        if preference.get("id"):
            return jsonify({"init_point": preference["init_point"]}), 200
        else:
            print(f"Erro ao criar preferência MP: {preference_response}")
            return jsonify({"message": "Erro ao criar preferência de pagamento"}), 500

    except Exception as e:
        print(f"Erro no endpoint create_subscription_preference: {e}")
        return jsonify({"message": "Erro interno do servidor"}), 500

# --- ENDPOINT 2: Webhook para Notificações do Mercado Pago ---
@app.route("/mercadopago/webhook", methods=["POST"])
def mercadopago_webhook():
    try:
        mp_id = request.args.get("data.id")
        mp_type = request.args.get("type")

        if not mp_id and request.json:
            mp_id = request.json.get("data", {}).get("id")
            mp_type = request.json.get("type")

        if not mp_id or not mp_type:
            print("Webhook: ID ou Tipo não recebidos. Ignorando.")
            return jsonify({"status": "ignorado"}), 200 

        print(f"Webhook recebido: Tipo={mp_type}, ID={mp_id}")

        if mp_type == "payment":
            payment_info = sdk.payment().get(mp_id)
            payment_status = payment_info["response"]["status"]
            external_reference = payment_info["response"].get("external_reference") 
            
            user_id = None
            if external_reference and "-" in external_reference:
                user_id, condo_id = external_reference.split("-")
            
            print(f"Pagamento {mp_id} status: {payment_status}")
            
            if payment_status == "approved":
                data, count = supabase_client.from('subscriptions').upsert(
                    {
                        'user_id': user_id,
                        'status': 'active',
                        'mercadopago_subscription_id': mp_id, 
                        'current_period_end': (datetime.now() + timedelta(days=30)).isoformat()
                    },
                    on_conflict=['user_id'] 
                ).execute()

                if data:
                    print(f"Assinatura do usuário {user_id} atualizada para 'active'.")
                else:
                    print(f"Erro ao atualizar assinatura do usuário {user_id} no Supabase: {count}")

            elif payment_status in ["pending", "in_process"]:
                print(f"Pagamento {mp_id} ainda pendente. Usuário {user_id}.")
            else:
                print(f"Pagamento {mp_id} não aprovado. Status: {payment_status}. Usuário {user_id}.")

        elif mp_type == "preapproval":
            preapproval_info = sdk.preapproval().get(mp_id)
            preapproval_status = preapproval_info["response"]["status"]
            external_reference = preapproval_info["response"].get("external_reference")

            user_id = None
            if external_reference and "-" in external_reference:
                user_id, condo_id = external_reference.split("-")

            print(f"Preapproval {mp_id} status: {preapproval_status}")

            if preapproval_status == "authorized": 
                data, count = supabase_client.from('subscriptions').upsert(
                    {
                        'user_id': user_id,
                        'status': 'active',
                        'mercadopago_subscription_id': mp_id,
                        'mercadopago_plan_id': preapproval_info["response"].get("preapproval_plan_id"),
                        'current_period_end': (datetime.now() + timedelta(days=30)).isoformat() 
                    },
                    on_conflict=['user_id'] 
                ).execute()
                if data: print(f"Assinatura do usuário {user_id} ativada/atualizada.")
                else: print(f"Erro ao atualizar assinatura para {user_id}: {count}")

            elif preapproval_status in ["paused", "cancelled", "finished"]:
                data, count = supabase_client.from('subscriptions').update(
                    {'status': preapproval_status.lower()} 
                ).eq('mercadopago_subscription_id', mp_id).execute()
                if data: print(f"Assinatura {mp_id} do usuário {user_id} atualizada para {preapproval_status.lower()}.")
                else: print(f"Erro ao atualizar status da assinatura {mp_id}: {count}")
        
        return jsonify({"status": "success"}), 200

    except Exception as e:
        print(f"Erro no webhook do Mercado Pago: {e}")
        return jsonify({"status": "error", "message": str(e)}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)