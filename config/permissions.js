// config/permissions.js

const rolePermissions = {
  admin: [
    '*', // Todos los permisos
    'crear_pedido',
    'editar_pedido',
    'eliminar_pedido',
    'crear_presupuesto',
    'editar_presupuesto',
    'eliminar_presupuesto',
    'gestionar_clientes',
    'gestionar_usuarios',
    'gestionar_stock',
    'ver_reportes',
    'gestionar_caja'
  ],
  vendedor: [
    'crear_pedido',
    'editar_pedido',
    'crear_presupuesto',
    'editar_presupuesto',
    'gestionar_clientes',
    'ver_reportes'
  ],
  operador: [
    'ver_pedidos',
    'editar_pedido',
    'ver_catalogo',
    'crear_pedido'
  ]
};

module.exports = rolePermissions;
