// config/permissions.js
module.exports = {
    Admin: [
      'clientes.view','clientes.create','clientes.edit','clientes.delete',
      'pedidos.view','pedidos.create','pedidos.edit','pedidos.delete',
      'usuarios.view','usuarios.create','usuarios.edit','usuarios.delete'
    ],
    Atención: [
      'clientes.view','clientes.create','clientes.edit',
      'pedidos.view','pedidos.create','pedidos.edit'
    ],
    Impresor: [
      'pedidos.view','pedidos.edit'
    ]
  };
  