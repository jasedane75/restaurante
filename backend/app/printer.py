from escpos.printer import Network, Usb
from datetime import datetime


def _get_printer():
    """
    Ajusta según tu impresora:
    - Red:  Network("192.168.1.100")
    - USB:  Usb(0x04b8, 0x0202)   <- vendor_id, product_id de tu impresora
    """
    return Network("192.168.1.100")


def imprimir_ticket(pedido: dict, items: list[dict], nombre_restaurante: str = "Mi Restaurante"):
    try:
        p = _get_printer()
        p.set(align="center", bold=True, double_height=True)
        p.text(f"{nombre_restaurante}\n")
        p.set(align="center", bold=False, double_height=False)
        p.text(f"{datetime.now().strftime('%d/%m/%Y %H:%M')}\n")

        tipo = pedido.get("tipo", "mesa").upper()
        ref = f"Mesa {pedido['mesa_id']}" if pedido.get("mesa_id") else pedido.get("cliente_nombre", "")
        p.text(f"{tipo} - {ref}\n")
        p.text(f"Pedido #{pedido['id']}\n")
        p.text("-" * 32 + "\n")

        for item in items:
            nombre = item.get("nombre", f"Prod. {item['producto_id']}")
            linea = f"{item['cantidad']}x {nombre}"
            precio = f"${item['subtotal']:.2f}"
            espacios = 32 - len(linea) - len(precio)
            p.text(f"{linea}{' ' * max(1, espacios)}{precio}\n")
            if item.get("notas"):
                p.text(f"  * {item['notas']}\n")

        p.text("-" * 32 + "\n")
        p.set(bold=True)
        total_str = f"TOTAL: ${pedido['total']:.2f}"
        p.text(total_str.center(32) + "\n")
        p.set(bold=False)
        p.text(f"Pago: {pedido.get('metodo_pago', '').upper()}\n")
        p.text("\n¡Gracias por su visita!\n\n")
        p.cut()
    except Exception as e:
        print(f"[Impresora] Error: {e}")
