import { Router } from "express";
import produtoController from "../produtos/produto.controller.js";
import carrinhoController from "../carrinho/carrinho.controller.js";
import Auth from "../middleware/auth.js";

const rotas = Router();

//  Todos podem ver produtos
rotas.get("/produtos", produtoController.listar);
rotas.post("/produtos", produtoController.adicionar);

//  Apenas admin pode adicionar produto
// rotas.post("/produtos", Auth, (req, res, next) => {
//   if ((req as any).tipo !== "admin") {
//     return res.status(403).json({ mensagem: "Apenas administradores podem criar produtos." });
//   }
//   next();
// }, produtoController.adicionar);

//  Carrinho (somente logado)
rotas.post("/adicionarItem", carrinhoController.adicionarItem);
rotas.get("/carrinho", carrinhoController.listar);
rotas.put("/carrinho/:itemId", Auth, carrinhoController.atualizarQuantidade);
rotas.delete("/carrinho/:produtoId", Auth, carrinhoController.removerItem);
rotas.delete("/carrinho", Auth, carrinhoController.limparCarrinho);

export default rotas;
