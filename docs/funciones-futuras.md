# GPS Ecuador — funcionalidades previstas

Este documento es una especificación; **no implica que las funciones estén desplegadas**.

## Administración de vehículos
- Alta y baja de vehículos con identificador interno y nombre.
- Asociación segura de cada rastreador con un vehículo autorizado.
- Estados: actualización reciente, sin señal y desconocido.
- Separación de vehículos por propietario u organización.

## Historial
- Selección de vehículo y período (máximo 31 días por consulta).
- Recorrido en mapa, fechas y horas, velocidad y paradas.
- Exportaciones solo para usuarios autorizados, con límites y auditoría.
- Política configurable de retención de posiciones.

## Alertas
- Pérdida de señal, velocidad por encima del umbral configurado y entrada/salida de geocercas.
- Evitar avisos repetidos mediante período de silencio.
- Registro de fecha, vehículo, motivo y destinatario.
- Alertas reales solo después de verificar el protocolo y los datos del dispositivo.

## Seguridad y comercialización
- Inicio de sesión, recuperación de cuenta y sesiones seguras.
- Permisos de acceso comprobados en el servidor para cada organización y vehículo.
- No colocar tokens o datos privados en GitHub Pages.
- Registro de auditoría, privacidad y consentimiento de seguimiento.

## Criterios de aceptación
- Ningún usuario puede consultar posiciones de otra organización.
- Un GPS sin señal se muestra claramente como desactualizado.
- Las fechas se guardan en UTC y se muestran según zona horaria del usuario.
- Un vehículo real debe superar pruebas de campo antes de dar por operativo el servicio.
