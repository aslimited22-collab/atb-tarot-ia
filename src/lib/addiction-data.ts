// Conteúdo estruturado extraído dos PDFs da ATB
// Usado na rota /api/addiction para categorias com material próprio

export type Ritual = {
  name: string;
  steps: string[];
};

export type RoutinePeriod = {
  period: "Manhã" | "Tarde" | "Noite" | "Antes de Dormir";
  steps: string[];
};

export type AddictionEntry = {
  card: string;
  cardMeaning: string;
  forces: string[];      // arcanjos / mentores espirituais
  insight: string;       // camada emocional/espiritual profunda
  rituals: Ritual[];
  routine: RoutinePeriod[];
  truth: string;         // frase final poderosa
};

export const ADDICTION_DATA: Record<string, AddictionEntry> = {

  "Procrastinação": {
    card: "O Enforcado",
    cardMeaning:
      "A carta da estagnação, do tempo parado, da sensação de estar suspensa na própria vida. " +
      "Ela revela que você não está parada porque não consegue — está parada porque algo dentro de você não deixa. " +
      "Você está travada entre querer fazer e ter medo de fazer, e isso gera tensão interna que paralisa.",
    forces: ["Arcanjo Miguel — corta bloqueios e travas internas", "Arcanjo Uriel — traz ação, direção e decisões práticas"],
    insight:
      "Sua mente cria resistência trazendo 'e se der errado', 'não está perfeito ainda', 'depois faço melhor'. " +
      "Isso não é lógica — é defesa. " +
      "Cada vez que você não age, culpa e frustração se acumulam e tiram ainda mais energia. " +
      "Tudo que você não faz fica acumulado criando um campo de estagnação: cansaço sem motivo, falta de força, desânimo constante. Isso não é preguiça — é energia parada.",
    rituals: [
      {
        name: "Ritual da Canela — Ativar Ação",
        steps: [
          "Coloque um pouco de canela em pó na palma da mão.",
          "Assopre levemente para o ar em direção à porta ou janela.",
          "Diga: 'Eu ativo movimento na minha vida. Eu saio da estagnação. Eu entro em ação.'",
        ],
      },
      {
        name: "Ritual do Louro — Quebra de Bloqueio",
        steps: [
          "Pegue 1 folha de louro e escreva nela com caneta: 'medo' ou 'trava'.",
          "Queime com cuidado em local seguro.",
          "Enquanto queima, diga: 'Eu libero esse bloqueio. Eu não me prendo mais nisso.'",
        ],
      },
      {
        name: "Vela de Ação",
        steps: [
          "Use uma vela amarela (clareza) ou laranja (coragem).",
          "Acenda e diga: 'Eu começo mesmo sem vontade. Eu ajo mesmo com medo. Eu me movimento.'",
          "Fique em silêncio por alguns minutos sentindo a decisão se firmar.",
        ],
      },
    ],
    routine: [
      {
        period: "Manhã",
        steps: [
          "Ao acordar, levante imediatamente — não fique na cama pensando.",
          "Faça algo físico pequeno: arrumar a cama, organizar algo.",
          "Escolha uma tarefa simples que costuma adiar e faça logo nos primeiros 30 minutos.",
        ],
      },
      {
        period: "Tarde",
        steps: [
          "Não espere vontade — aja mesmo sem ela.",
          "Escolha 1 tarefa importante e divida em partes pequenas.",
          "Se travar: levante, ande pelo ambiente e volte para começar de novo.",
        ],
      },
      {
        period: "Noite",
        steps: [
          "Pegue papel e escreva o que fez hoje, mesmo que pouco — isso reforça progresso.",
          "Escreva o que vai começar amanhã — isso prepara a mente.",
        ],
      },
      {
        period: "Antes de Dormir",
        steps: [
          "Deite e diga: 'Eu não paro mais no mesmo lugar. Eu continuo amanhã.'",
        ],
      },
    ],
    truth:
      "Você não está parada porque não consegue. Está parada porque não começou da forma certa. " +
      "O movimento não vem da vontade — vem da ação. E quando você começa, mesmo pequeno, o bloqueio começa a cair.",
  },

  "Alimentação Emocional": {
    card: "A Imperatriz",
    cardMeaning:
      "A carta do cuidado, do acolhimento, do nutrir. Quando essa energia está desequilibrada, você tenta se nutrir do lado de fora " +
      "porque não consegue se sustentar por dentro. " +
      "O vazio que você sente não está no estômago — está dentro, e ele não pede comida, pede presença e acolhimento.",
    forces: [
      "Arcanjo Gabriel — acolhimento emocional e conexão com sentimentos",
      "Arcanjo Haniel — equilíbrio emocional e suavização de compulsões",
    ],
    insight:
      "Em algum momento da sua infância faltou acolhimento, presença, segurança emocional. " +
      "A comida estava lá — não julgava, não rejeitava, não abandonava. Ela preenchia, mesmo que por pouco. " +
      "Hoje quando você sente solidão, ansiedade ou tristeza, o corpo tenta resolver do jeito que aprendeu. " +
      "O ciclo é: você sente → come → alivia → sente de novo. Não é só hábito — é padrão aprendido.",
    rituals: [
      {
        name: "Ritual do Sal — Equilíbrio",
        steps: [
          "Coloque um pouco de sal grosso em um prato pequeno.",
          "Passe as mãos por cima lentamente.",
          "Diga: 'Eu me equilibro. Eu não preciso preencher vazio com comida.' Depois descarte o sal.",
        ],
      },
      {
        name: "Ritual do Perfume — Substituição Sensorial",
        steps: [
          "Quando vier a vontade emocional de comer, antes de agir — pare.",
          "Passe um perfume leve no pulso e respire fundo três vezes.",
          "Espere 5 minutos observando se ainda é fome ou era emoção.",
        ],
      },
      {
        name: "Vela Rosa — Auto Cuidado",
        steps: [
          "Acenda uma vela rosa em um momento tranquilo.",
          "Diga: 'Eu me cuido. Eu me acolho. Eu não preciso me preencher com excesso.'",
          "Fique alguns minutos em silêncio se acolhendo.",
        ],
      },
    ],
    routine: [
      {
        period: "Manhã",
        steps: [
          "Beba um copo de água em jejum antes de qualquer coisa.",
          "Espere 10 a 15 minutos antes de comer — observe se a fome é real ou emocional.",
          "Antes de comer, coloque a mão no estômago e pergunte: 'Isso é fome ou é ansiedade?'",
          "Coma sem celular, sem distração, mastigue devagar.",
        ],
      },
      {
        period: "Tarde",
        steps: [
          "Antes de qualquer lanche, espere 5 minutos para verificar se é emocional.",
          "Não coma direto do pacote — sempre coloque no prato.",
          "Se vier vontade forte: beba água, levante e mude de ambiente antes de decidir.",
        ],
      },
      {
        period: "Noite",
        steps: [
          "Antes de comer à noite, pergunte: 'Estou com fome ou tentando me acalmar?'",
          "Se não for fome, espere 10 minutos — deixe a emoção passar.",
          "Após o jantar, levante da mesa e mude de ambiente imediatamente.",
        ],
      },
      {
        period: "Antes de Dormir",
        steps: [
          "Pergunte: 'Quando eu comi sem fome hoje?' — sem culpa, só observação.",
          "Isso identifica o padrão e prepara você para o dia seguinte.",
        ],
      },
    ],
    truth:
      "Você não precisa de mais comida. Você precisa de mais consciência. " +
      "O problema não é a comida — é o que você está tentando resolver com ela. " +
      "Quando você começa a perceber 'isso não é fome', você começa a se libertar.",
  },

  "Relacionamentos Tóxicos": {
    card: "O Diabo",
    cardMeaning:
      "A carta do apego, da dependência, da prisão emocional. Não porque existe mal — mas porque existe uma ligação forte demais, confusa demais, difícil de quebrar. " +
      "Você não está presa na pessoa. Está presa no medo de ficar sozinha, na necessidade de ser validada e no vínculo que você mesma alimentou.",
    forces: [],
    insight:
      "Você já tentou sair mas não conseguiu. Racionalmente você sabe que não está bom, que te machuca, que merece mais. " +
      "Mas quando se afasta, algo puxa de volta — e esse algo não é amor, é apego emocional. " +
      "A mente seleciona as memórias boas e apaga as dores, criando uma esperança falsa. " +
      "Você não volta porque esqueceu — volta porque não consegue sustentar o que sente quando está longe: o vazio, a saudade, o silêncio.",
    rituals: [
      {
        name: "Ritual da Verdade",
        steps: [
          "Pegue papel e caneta. Escreva tudo que te machucou, tudo que você engoliu, tudo que você aceitou.",
          "Leia sem romantizar — encare a realidade, não a fantasia.",
          "Depois rasgue o papel. Isso quebra a ilusão.",
        ],
      },
      {
        name: "Ritual de Desapego",
        steps: [
          "À noite, pegue um copo com água e adicione uma pitada de sal.",
          "Segure com as duas mãos e diga: 'Eu libero esse vínculo. Eu solto o que me prende. Eu me devolvo para mim.'",
          "Jogue essa água na pia — isso simboliza o corte.",
        ],
      },
      {
        name: "Banho de Desapego",
        steps: [
          "Ferva água com manjericão, folha de louro e casca de alho (se tiver).",
          "Espere amornar. Depois do banho normal, jogue do pescoço para baixo.",
          "Enquanto joga, pense: 'Estou deixando ir o que me prende.'",
        ],
      },
    ],
    routine: [
      {
        period: "Manhã",
        steps: [
          "Não pegue o celular imediatamente — fique pelo menos 5 minutos sem olhar.",
          "Diga em voz baixa: 'Hoje eu não volto para o que me machuca. Hoje eu me escolho.'",
          "Lave o rosto com água fria — isso tira o corpo do estado emocional e traz ao presente.",
        ],
      },
      {
        period: "Tarde",
        steps: [
          "Ocupe a mente com algo concreto: limpar, organizar, resolver algo.",
          "Se vier pensamento sobre a pessoa, não aprofunde — corte rápido e troque de atividade.",
          "Não fique sozinha pensando por muito tempo — a mente usa o silêncio para puxar de volta.",
        ],
      },
      {
        period: "Noite",
        steps: [
          "Não revise conversas antigas — isso reativa o vínculo emocional.",
          "Não veja redes sociais da pessoa — isso mantém a ligação ativa.",
          "Pegue papel e escreva como você se sentia de verdade quando estava com essa pessoa — sem romantizar.",
          "Rasgue o papel — simboliza o corte.",
        ],
      },
      {
        period: "Antes de Dormir",
        steps: [
          "Deite, respire fundo e diga: 'Eu estou me libertando. Eu não volto para o que me machuca. Eu estou voltando para mim.'",
          "Se vier pensamento da pessoa, não lute — deixe passar como se fosse um filme.",
        ],
      },
    ],
    truth:
      "Você não volta porque ama. Você volta porque sente falta do que aquilo te dava. " +
      "Quando você aprende a sustentar isso sozinha, você para de aceitar qualquer coisa. " +
      "E isso é o começo da sua liberdade.",
  },

  "Álcool": {
    card: "A Lua",
    cardMeaning:
      "A carta das ilusões, dos ciclos noturnos e do que se esconde nas sombras. O álcool entra como alívio quando você está cansada, ansiosa, sobrecarregada ou vazia. " +
      "Parece que resolve — mas é exatamente aí que começa o ciclo. " +
      "A Lua revela que existe algo por trás do hábito que precisa ser visto à luz.",
    forces: [],
    insight:
      "O ciclo é: você sente um incômodo, tenta ignorar, mas ele cresce. Você bebe, vem o alívio. " +
      "Depois vêm culpa, vergonha, arrependimento — e tudo começa de novo. " +
      "O álcool muitas vezes vira forma de lidar com solidão, pressão e cansaço emocional. " +
      "Ele não te acalma — ele só alivia temporariamente o desconforto que ele mesmo criou.",
    rituals: [
      {
        name: "Ritual da Vela Branca — Força e Decisão",
        steps: [
          "Escolha um dia tranquilo (domingo ou segunda funciona bem).",
          "Acenda uma vela branca em local seguro. Fique alguns minutos em silêncio.",
          "Diga: 'Eu não aceito mais viver presa nisso. Eu quero força para mudar. Eu quero equilíbrio na minha vida.' Deixe a vela queimar com segurança.",
        ],
      },
      {
        name: "Banho de Limpeza",
        steps: [
          "Ferva água com alecrim, hortelã e camomila. Espere amornar.",
          "Depois do banho normal, jogue do pescoço para baixo.",
          "Enquanto joga, pense: 'Estou deixando ir o que me prende.'",
          "Faça 2 a 3 vezes por semana.",
        ],
      },
      {
        name: "Repetição Consciente",
        steps: [
          "Quando a vontade vier, fale mentalmente: 'Isso não me controla.'",
          "Espere alguns minutos, respire e mude de ambiente antes de agir.",
          "Isso quebra o automático e devolve o poder de escolha a você.",
        ],
      },
    ],
    routine: [
      {
        period: "Manhã",
        steps: [
          "Comece o dia com um copo de água — isso estabelece o padrão correto desde cedo.",
          "Abra janelas, deixe entrar ar e luz — ambiente pesado reforça padrões negativos.",
        ],
      },
      {
        period: "Tarde",
        steps: [
          "Observe seus gatilhos: lugares, pessoas e horários que disparam a vontade.",
          "Reduza o contato com esses contextos aos poucos.",
          "Substitua por chá de camomila, erva-doce ou melissa.",
        ],
      },
      {
        period: "Noite",
        steps: [
          "Nunca beba de estômago vazio — isso intensifica o efeito e a compulsão.",
          "Se vier a vontade: beba água primeiro, espere 10 minutos e veja se passa.",
          "Limpeza semanal do ambiente: ar, organização, plantas — isso suaviza o padrão.",
        ],
      },
      {
        period: "Antes de Dormir",
        steps: [
          "Diga: 'Me dá força para resistir. Me dá clareza para escolher melhor. Me ajuda a sair desse ciclo.'",
          "Não precisa ser perfeito — precisa ser constante.",
        ],
      },
    ],
    truth:
      "Você pode estar presa nisso agora. Mas isso não define quem você é. " +
      "Existe uma parte sua que quer sair — e isso já é um começo.",
  },

  "Cigarro": {
    card: "O Mago",
    cardMeaning:
      "A carta do controle, da vontade e da capacidade de transformar realidade. " +
      "Mas quando invertida, revela que algo externo passou a ter controle sobre você. " +
      "Você não acende só porque quer — acende porque algo dentro de você pede, muitas vezes sem você perceber. Isso não é escolha — é automático.",
    forces: [],
    insight:
      "No começo foi leve: curiosidade, influência, um momento. Mas o cigarro se ligou a situações da sua vida: nervosismo, pausa, cansaço, pensamento. " +
      "O ciclo é: você sente um desconforto, o corpo pede, a mente lembra, você fuma, vem um pequeno alívio — e o corpo volta a pedir. " +
      "O cigarro não te acalma. Ele só alivia o desconforto que ele mesmo criou. Mas o seu cérebro interpreta como solução — e isso mantém o vício.",
    rituals: [
      {
        name: "Ritual de Corte do Hábito",
        steps: [
          "Escolha uma noite tranquila. Acenda uma vela branca.",
          "Em silêncio, diga: 'Eu não aceito mais ser controlada por esse hábito. Eu quero recuperar o controle da minha mente. Eu escolho mudar.'",
          "Fique alguns minutos em silêncio — isso marca internamente o início da mudança.",
        ],
      },
      {
        name: "Banho de Limpeza",
        steps: [
          "Ferva água com alecrim, hortelã e guiné (se tiver). Espere amornar.",
          "Depois do banho normal, jogue do pescoço para baixo.",
          "Faça 2 vezes por semana — ajuda a aliviar o peso e a repetição.",
        ],
      },
      {
        name: "Frase de Controle",
        steps: [
          "Quando der vontade, repita mentalmente: 'Isso não me controla.'",
          "Espere alguns minutos, respire, não acenda imediatamente.",
          "Isso já quebra o automático e reposiciona quem está no controle.",
        ],
      },
    ],
    routine: [
      {
        period: "Manhã",
        steps: [
          "Não fume automaticamente junto com o café — quebre esse vínculo específico.",
          "Substitua o primeiro cigarro do dia por um copo de água e respiração profunda.",
        ],
      },
      {
        period: "Tarde",
        steps: [
          "Observe seus gatilhos: horários, locais e contextos onde sempre fuma.",
          "Evite situações automáticas — isso reduz muito o impulso.",
          "Quando der vontade: espere alguns minutos, respire, mude de ambiente antes de decidir.",
        ],
      },
      {
        period: "Noite",
        steps: [
          "Uma vez por semana: abra janelas, organize o espaço — o ambiente influencia o hábito.",
          "Substitua o cigarro noturno por chá de hortelã, camomila ou erva-doce.",
          "Mastighe algo quando vier a vontade forte.",
        ],
      },
      {
        period: "Antes de Dormir",
        steps: [
          "Diga: 'Me ajuda a sair desse ciclo. Me dá força para resistir. Me dá clareza nas minhas escolhas.'",
          "Repetição cria força mental — faça todas as noites.",
        ],
      },
    ],
    truth:
      "Você não precisa disso. Você só se acostumou. " +
      "E tudo que é aprendido pode ser desaprendido. Você ainda tem controle. Você ainda tem escolha.",
  },

};

// Categorias sem PDF — resposta via DeepSeek
export const AI_ONLY_CATEGORIES = new Set(["Ansiedade Crônica", "Vício em Redes Sociais"]);

// Lookup case-insensitive + Unicode NFC (iOS Safari às vezes envia acentos decompostos NFD)
const normKey = (s: string) => s.normalize("NFC").toLowerCase().trim();

const NORMALIZED_DATA: Record<string, AddictionEntry> = {};
for (const [k, v] of Object.entries(ADDICTION_DATA)) {
  NORMALIZED_DATA[normKey(k)] = v;
}

const NORMALIZED_AI: Record<string, string> = {};
for (const c of AI_ONLY_CATEGORIES) {
  NORMALIZED_AI[normKey(c)] = c;
}

export function findAddictionEntry(category: string): AddictionEntry | null {
  return NORMALIZED_DATA[normKey(category)] || null;
}

export function isAiOnlyCategory(category: string): string | null {
  return NORMALIZED_AI[normKey(category)] || null;
}
