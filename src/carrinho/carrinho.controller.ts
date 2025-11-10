import { Request, Response } from "express";
import { ObjectId } from "bson";
import { db } from "../database/banco-mongo.js";

interface ItemCarrinho {
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
  nome: string;
}

interface Carrinho {
  usuarioId: string;
  itens: ItemCarrinho[];
  dataAtualizacao: Date;
  total: number;
}

interface Produto {
  _id: ObjectId;
  nome: string;
  preco: number;
  descricao: string;
  urlfoto: string;
}

interface RequestAuth extends Request {
  usuarioId?: string;
}

class CarrinhoController {
  async adicionarItem(req: RequestAuth, res: Response) {
    const { produtoId, quantidade } = req.body;
    const usuarioId = req.usuarioId;

    if (!usuarioId) {
      return res.status(401).json({ mensagem: "Usuário não autenticado" });
    }

    const produto = await db.collection<Produto>("produtos").findOne({ _id: new ObjectId(produtoId) });
    if (!produto) {
      return res.status(404).json({ mensagem: "Produto não encontrado" });
    }

    const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId });

    const novoItem: ItemCarrinho = {
      produtoId,
      quantidade,
      precoUnitario: produto.preco,
      nome: produto.nome,
    };

    if (!carrinho) {
      const novoCarrinho: Carrinho = {
        usuarioId,
        itens: [novoItem],
        dataAtualizacao: new Date(),
        total: produto.preco * quantidade,
      };

      const resposta = await db.collection<Carrinho>("carrinhos").insertOne(novoCarrinho);
      return res.status(201).json({ ...novoCarrinho, _id: resposta.insertedId });
    }

    const itemExistente = carrinho.itens.find((item) => item.produtoId === produtoId);
    if (itemExistente) {
      itemExistente.quantidade += quantidade;
    } else {
      carrinho.itens.push(novoItem);
    }

    carrinho.total = carrinho.itens.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0);
    carrinho.dataAtualizacao = new Date();

    await db.collection<Carrinho>("carrinhos").updateOne(
      { usuarioId },
      {
        $set: {
          itens: carrinho.itens,
          total: carrinho.total,
          dataAtualizacao: carrinho.dataAtualizacao,
        },
      }
    );

    res.status(200).json(carrinho);
  }

  async removerItem(req: RequestAuth, res: Response) {
    const { produtoId } = req.params;
    const usuarioId = req.usuarioId;

    if (!usuarioId) {
      return res.status(401).json({ mensagem: "Usuário não autenticado" });
    }

    const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId });
    if (!carrinho) {
      return res.status(404).json({ mensagem: "Carrinho não encontrado" });
    }

    const itemExistente = carrinho.itens.find((item) => item.produtoId === produtoId);
    if (!itemExistente) {
      return res.status(404).json({ mensagem: "Item não encontrado" });
    }

    const itensAtualizados = carrinho.itens.filter((item) => item.produtoId !== produtoId);
    const total = itensAtualizados.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0);

    await db.collection<Carrinho>("carrinhos").updateOne(
      { usuarioId },
      {
        $set: {
          itens: itensAtualizados,
          total,
          dataAtualizacao: new Date(),
        },
      }
    );

    res.status(200).json({ usuarioId, itens: itensAtualizados, total });
  }

  async atualizarQuantidade(req: RequestAuth, res: Response) {
    const { quantidade } = req.body;
    const { itemId } = req.params;
    const usuarioId = req.usuarioId;

    if (!usuarioId) {
      return res.status(401).json({ mensagem: "Usuário não autenticado" });
    }

    const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId });
    if (!carrinho) {
      return res.status(404).json({ mensagem: "Carrinho não encontrado" });
    }

    const item = carrinho.itens.find((i) => i.produtoId === itemId);
    if (!item) {
      return res.status(404).json({ mensagem: "Item não encontrado" });
    }

    item.quantidade = quantidade;
    carrinho.total = carrinho.itens.reduce((acc, i) => acc + i.precoUnitario * i.quantidade, 0);
    carrinho.dataAtualizacao = new Date();

    await db.collection<Carrinho>("carrinhos").updateOne(
      { usuarioId },
      {
        $set: {
          itens: carrinho.itens,
          total: carrinho.total,
          dataAtualizacao: carrinho.dataAtualizacao,
        },
      }
    );

    res.status(200).json(carrinho);
  }

  async listar(req: RequestAuth, res: Response) {
    const usuarioId = req.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ mensagem: "Usuário não autenticado" });
    }

    const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId });
    if (!carrinho) {
      return res.status(200).json({ itens: [] });
    }

    const itensComProduto = [];
    for (const item of carrinho.itens) {
      const produto = await db.collection("produtos").findOne({ _id: new ObjectId(item.produtoId) });
      if (produto) {
        itensComProduto.push({
          _id: item.produtoId,
          produto,
          quantidade: item.quantidade,
        });
      }
    }

    res.status(200).json({ itens: itensComProduto });
  }

  async limparCarrinho(req: RequestAuth, res: Response) {
    const usuarioId = req.usuarioId;

    if (!usuarioId) {
      return res.status(401).json({ mensagem: "Usuário não autenticado" });
    }

    await db.collection<Carrinho>("carrinhos").deleteOne({ usuarioId });
    res.status(200).json({ mensagem: "Carrinho removido com sucesso" });
  }
}

export default new CarrinhoController();
