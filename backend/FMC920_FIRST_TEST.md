# GPS Ecuador — primera prueba del Teltonika FMC920

**Estado:** plan de pruebas, no prueba física realizada. No publicar el puerto TCP antes de revisar firewall, registros y autenticación por IMEI.

## Antes de recibir el equipo (sin rastreador)
- Confirmar con el proveedor que la variante FMC920 admite las bandas LTE de la operadora de la SIM en Ecuador.
- Preparar SIM activa con datos, APN, PIN desactivado si corresponde y saldo/plan vigente; confirmar si la SIM admite datos y conexión TCP saliente.
- Verificar dominio/IP y puerto de recepción únicamente cuando el receptor esté desplegado, protegido y probado en red privada.
- Crear copia comprobada de la base de datos; revisar tablas reales `vehicles`, `devices`, `positions`.
- Ejecutar pruebas automatizadas y simulación de conexión TCP en entorno aislado, nunca insertar datos simulados en producción.
- No pegar IMEI, contraseñas, claves SSH o datos de SIM en GitHub ni en capturas públicas.

## Al recibir el FMC920
1. Identificar modelo y variante exactos en la etiqueta y confirmar firmware compatible con el configurador oficial Teltonika.
2. Revisar manual y alimentación del modelo; utilizar fuente y protección adecuadas. No improvisar conexiones en el vehículo.
3. Instalar SIM, comprobar red celular y GPS en un lugar con buena visibilidad del cielo.
4. Anotar IMEI de 15 dígitos en un registro privado y asociarlo al vehículo autorizado en `devices`; no permitir IMEI desconocidos.
5. Configurar APN de la operadora, protocolo TCP, dirección y puerto del servidor, y Codec 8 / 8 Extended según soporte confirmado.
6. Verificar en registros que se acepta el IMEI, llegan tramas AVL válidas, se devuelve ACK y se guardan coordenadas reales.
7. Confirmar en el panel que el punto aparece en la posición correcta y se actualiza al moverse el vehículo.
8. Apagar/reiniciar el dispositivo y verificar reconexión, retención de datos y ausencia de puntos duplicados.
9. Verificar que no aparecen coordenadas 0,0, fechas futuras ni ubicaciones de otros vehículos.
10. Ajustar el intervalo de reporte y el umbral de alerta de 15 minutos para evitar falsas alarmas.

## Criterios de aceptación de la primera prueba
- [ ] IMEI autorizado y otro IMEI rechazado
- [ ] Recepción TCP y ACK confirmados
- [ ] Posición real guardada en PostgreSQL
- [ ] Mapa privado muestra posición y hora correctas
- [ ] Recorrido visible después de desplazamiento autorizado
- [ ] Reconexión comprobada
- [ ] Alertas revisadas
- [ ] Respaldo y restauración comprobados

## Antes de ampliar a 20 vehículos
Probar 20 conexiones simultáneas reales o emuladas a nivel TCP con DB de prueba, tráfico fragmentado, reconexiones, reintentos y duplicados; vigilar consumo de recursos. La prueba existente de 20 paquetes decodificados no equivale a una prueba de carga.

**Privacidad:** usar exclusivamente vehículos propios o de personas que hayan autorizado expresamente el rastreo; limitar acceso a ubicaciones.
