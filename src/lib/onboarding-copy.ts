export const ONBOARDING_LANGS = [
  { id: "en", label: "English" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
  { id: "zh-Hans", label: "简体中文" },
  { id: "zh-Hant", label: "繁體中文" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "pt", label: "Português" },
  { id: "it", label: "Italiano" },
  { id: "nl", label: "Nederlands" },
  { id: "pl", label: "Polski" },
  { id: "sv", label: "Svenska" },
  { id: "tr", label: "Türkçe" },
  { id: "ru", label: "Русский" },
  { id: "ar", label: "العربية" },
  { id: "hi", label: "हिन्दी" },
  { id: "id", label: "Bahasa Indonesia" },
  { id: "th", label: "ไทย" },
  { id: "vi", label: "Tiếng Việt" },
] as const;

export type OnboardingLang = (typeof ONBOARDING_LANGS)[number]["id"];

export type OnboardingCopy = {
  kicker: string;
  title: string;
  intro: string;
  steps: {
    observe: { title: string; body: string };
    observeAgain: { title: string; body: string };
    compare: { title: string; body: string };
    share: { title: string; body: string };
  };
  costNote: string;
  primaryCta: string;
  skip: string;
  helpLink: string;
  checklistTitle: string;
  checklistBody: string;
  checklistCta: string;
  regionHint: string;
  dialogAria: string;
  languageLabel: string;
};

export const DEFAULT_ONBOARDING_LANG: OnboardingLang = "en";

const en: OnboardingCopy = {
  kicker: "Getting started",
  title: "How to start",
  intro:
    "The loop is Observe → Observe again → Compare → Share. Start by picking a URL and region, then keep one Observation.",
  steps: {
    observe: {
      title: "Observe",
      body: "Use Try by region. Pick a URL and region. One region = one Observation.",
    },
    observeAgain: {
      title: "Observe again",
      body: "Run the same URL and region again to keep a second timestamp.",
    },
    compare: {
      title: "Compare",
      body: "Time Compare and Region Compare are separate axes. Screenshots are only Same / Changed / Not comparable. Changed means the screenshot content differs—not that the page changed.",
    },
    share: {
      title: "Share",
      body: "Select existing records and share them on one link. No extra capture.",
    },
  },
  costNote: "A capture uses one monthly Observation. Compare and Share use none.",
  primaryCta: "Create your first Observation",
  skip: "Later",
  helpLink: "Full tour and videos in Help",
  checklistTitle: "First step",
  checklistBody:
    "You do not have an Observation yet. Pick a URL and region to record what rendered at that time.",
  checklistCta: "Try by region",
  regionHint: "This is the first step. Pick a URL and region to record.",
  dialogAria: "How to start",
  languageLabel: "Language",
};

export const onboardingCopy: Record<OnboardingLang, OnboardingCopy> = {
  en,
  ja: {
    kicker: "はじめ方",
    title: "はじめての使い方",
    intro:
      "流れは Observe → Observe again → Compare → Share です。まずは URL と地域を選んで、1 件の Observation を残します。",
    steps: {
      observe: {
        title: "Observe",
        body: "「地域で試す」で URL と地域を指定します。1 地域 = 1 Observation です。",
      },
      observeAgain: {
        title: "Observe again",
        body: "同じ URL と地域でもう一度実行すると、時点の違う 2 件目が残ります。",
      },
      compare: {
        title: "Compare",
        body: "Time Compare と Region Compare は別軸です。Screenshot は Same / Changed / Not comparable だけです。Changed は画像の差であり、ページが変わったとは言いません。",
      },
      share: {
        title: "Share",
        body: "既存の記録を選んで 1 本のリンクで渡せます。追加の撮影はありません。",
      },
    },
    costNote: "撮影は月の Observation を 1 件使います。Compare / Share は使いません。",
    primaryCta: "最初の Observation を作る",
    skip: "あとで",
    helpLink: "ツアーと動画はヘルプ",
    checklistTitle: "はじめの一歩",
    checklistBody:
      "まだ Observation がありません。URL と地域を選ぶと、その時点の表示が記録されます。",
    checklistCta: "地域で試す",
    regionHint: "これが最初のステップです。URL と地域を選んで記録します。",
    dialogAria: "はじめての使い方",
    languageLabel: "言語",
  },
  ko: {
    kicker: "시작하기",
    title: "처음 사용하는 방법",
    intro:
      "흐름은 Observe → Observe again → Compare → Share 입니다. URL과 지역을 고르고 Observation 한 건을 남기세요.",
    steps: {
      observe: {
        title: "Observe",
        body: "지역으로 시도에서 URL과 지역을 지정합니다. 지역 1곳 = Observation 1건입니다.",
      },
      observeAgain: {
        title: "Observe again",
        body: "같은 URL과 지역을 다시 실행하면 시점이 다른 두 번째 기록이 남습니다.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare와 Region Compare는 다른 축입니다. 스크린샷은 Same / Changed / Not comparable 뿐입니다. Changed는 이미지 차이이며, 페이지가 바뀌었다고 말하지 않습니다.",
      },
      share: {
        title: "Share",
        body: "기존 기록을 골라 링크 하나로 전달합니다. 추가 촬영은 없습니다.",
      },
    },
    costNote: "촬영은 월 Observation 1건을 씁니다. Compare / Share는 쓰지 않습니다.",
    primaryCta: "첫 Observation 만들기",
    skip: "나중에",
    helpLink: "투어와 영상은 도움말",
    checklistTitle: "첫 단계",
    checklistBody: "아직 Observation이 없습니다. URL과 지역을 고르면 그 시점의 표시가 기록됩니다.",
    checklistCta: "지역으로 시도",
    regionHint: "첫 단계입니다. URL과 지역을 골라 기록하세요.",
    dialogAria: "처음 사용하는 방법",
    languageLabel: "언어",
  },
  "zh-Hans": {
    kicker: "开始使用",
    title: "如何开始",
    intro: "流程是 Observe → Observe again → Compare → Share。先选 URL 和地区，留下 1 条 Observation。",
    steps: {
      observe: {
        title: "Observe",
        body: "在按地区尝试中指定 URL 和地区。1 个地区 = 1 条 Observation。",
      },
      observeAgain: {
        title: "Observe again",
        body: "对同一 URL 和地区再执行一次，会留下时间点不同的第 2 条记录。",
      },
      compare: {
        title: "Compare",
        body: "Time Compare 与 Region Compare 是不同轴。截图只有 Same / Changed / Not comparable。Changed 表示图像内容不同，不是说页面变了。",
      },
      share: {
        title: "Share",
        body: "选择已有记录，用一条链接分享。不会再次拍摄。",
      },
    },
    costNote: "拍摄消耗 1 条每月 Observation。Compare / Share 不消耗。",
    primaryCta: "创建第一条 Observation",
    skip: "稍后",
    helpLink: "完整导览和视频在帮助",
    checklistTitle: "第一步",
    checklistBody: "还没有 Observation。选择 URL 和地区，即可记录当时的显示。",
    checklistCta: "按地区尝试",
    regionHint: "这是第一步。选择 URL 和地区并记录。",
    dialogAria: "如何开始",
    languageLabel: "语言",
  },
  "zh-Hant": {
    kicker: "開始使用",
    title: "如何開始",
    intro: "流程是 Observe → Observe again → Compare → Share。先選 URL 和地區，留下 1 筆 Observation。",
    steps: {
      observe: {
        title: "Observe",
        body: "在依地區嘗試中指定 URL 和地區。1 個地區 = 1 筆 Observation。",
      },
      observeAgain: {
        title: "Observe again",
        body: "對同一 URL 和地區再執行一次，會留下時間點不同的第 2 筆紀錄。",
      },
      compare: {
        title: "Compare",
        body: "Time Compare 與 Region Compare 是不同軸。截圖只有 Same / Changed / Not comparable。Changed 表示圖像內容不同，不是說頁面變了。",
      },
      share: {
        title: "Share",
        body: "選擇既有紀錄，用一條連結分享。不會再次拍攝。",
      },
    },
    costNote: "拍攝消耗 1 筆每月 Observation。Compare / Share 不消耗。",
    primaryCta: "建立第一筆 Observation",
    skip: "稍後",
    helpLink: "完整導覽和影片在說明",
    checklistTitle: "第一步",
    checklistBody: "還沒有 Observation。選擇 URL 和地區，即可記錄當時的顯示。",
    checklistCta: "依地區嘗試",
    regionHint: "這是第一步。選擇 URL 和地區並記錄。",
    dialogAria: "如何開始",
    languageLabel: "語言",
  },
  es: {
    kicker: "Primeros pasos",
    title: "Cómo empezar",
    intro:
      "El flujo es Observe → Observe again → Compare → Share. Elige una URL y una región y guarda una Observation.",
    steps: {
      observe: {
        title: "Observe",
        body: "Usa Probar por región. Elige una URL y una región. Una región = una Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Vuelve a ejecutar la misma URL y región para guardar un segundo instante.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare y Region Compare son ejes distintos. Las capturas solo son Same / Changed / Not comparable. Changed significa que el contenido de la imagen difiere, no que la página cambió.",
      },
      share: {
        title: "Share",
        body: "Elige registros existentes y compártelos en un enlace. Sin captura extra.",
      },
    },
    costNote: "Una captura usa una Observation mensual. Compare y Share no usan ninguna.",
    primaryCta: "Crear tu primera Observation",
    skip: "Más tarde",
    helpLink: "Tour y vídeos en Ayuda",
    checklistTitle: "Primer paso",
    checklistBody:
      "Aún no tienes una Observation. Elige una URL y una región para registrar lo que se vio en ese momento.",
    checklistCta: "Probar por región",
    regionHint: "Este es el primer paso. Elige una URL y una región para registrar.",
    dialogAria: "Cómo empezar",
    languageLabel: "Idioma",
  },
  fr: {
    kicker: "Pour commencer",
    title: "Comment démarrer",
    intro:
      "Le parcours est Observe → Observe again → Compare → Share. Choisissez une URL et une région, puis conservez une Observation.",
    steps: {
      observe: {
        title: "Observe",
        body: "Utilisez Essayer par région. Choisissez une URL et une région. Une région = une Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Relancez la même URL et la même région pour garder un second horodatage.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare et Region Compare sont des axes distincts. Les captures sont uniquement Same / Changed / Not comparable. Changed signifie que le contenu de l’image diffère — pas que la page a changé.",
      },
      share: {
        title: "Share",
        body: "Sélectionnez des enregistrements existants et partagez-les via un lien. Pas de capture supplémentaire.",
      },
    },
    costNote: "Une capture utilise une Observation mensuelle. Compare et Share n’en utilisent aucune.",
    primaryCta: "Créer votre première Observation",
    skip: "Plus tard",
    helpLink: "Visite et vidéos dans Aide",
    checklistTitle: "Première étape",
    checklistBody:
      "Vous n’avez pas encore d’Observation. Choisissez une URL et une région pour enregistrer l’affichage à cet instant.",
    checklistCta: "Essayer par région",
    regionHint: "C’est la première étape. Choisissez une URL et une région à enregistrer.",
    dialogAria: "Comment démarrer",
    languageLabel: "Langue",
  },
  de: {
    kicker: "Erste Schritte",
    title: "So starten Sie",
    intro:
      "Der Ablauf ist Observe → Observe again → Compare → Share. Wählen Sie eine URL und eine Region und behalten Sie eine Observation.",
    steps: {
      observe: {
        title: "Observe",
        body: "Nutzen Sie Nach Region testen. Wählen Sie URL und Region. Eine Region = eine Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Dieselbe URL und Region erneut ausführen, um einen zweiten Zeitpunkt zu behalten.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare und Region Compare sind getrennte Achsen. Screenshots sind nur Same / Changed / Not comparable. Changed heißt: der Bildinhalt unterscheidet sich — nicht, dass sich die Seite geändert hat.",
      },
      share: {
        title: "Share",
        body: "Wählen Sie vorhandene Datensätze und teilen Sie sie über einen Link. Keine Extra-Aufnahme.",
      },
    },
    costNote: "Eine Aufnahme verbraucht eine monatliche Observation. Compare und Share verbrauchen keine.",
    primaryCta: "Erste Observation erstellen",
    skip: "Später",
    helpLink: "Tour und Videos in Hilfe",
    checklistTitle: "Erster Schritt",
    checklistBody:
      "Sie haben noch keine Observation. Wählen Sie URL und Region, um festzuhalten, was zu diesem Zeitpunkt gerendert wurde.",
    checklistCta: "Nach Region testen",
    regionHint: "Das ist der erste Schritt. Wählen Sie URL und Region zum Aufzeichnen.",
    dialogAria: "So starten Sie",
    languageLabel: "Sprache",
  },
  pt: {
    kicker: "Primeiros passos",
    title: "Como começar",
    intro:
      "O fluxo é Observe → Observe again → Compare → Share. Escolha um URL e uma região e guarde uma Observation.",
    steps: {
      observe: {
        title: "Observe",
        body: "Use Tentar por região. Escolha um URL e uma região. Uma região = uma Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Execute de novo o mesmo URL e região para guardar um segundo instante.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare e Region Compare são eixos separados. Os screenshots são só Same / Changed / Not comparable. Changed significa que o conteúdo da imagem difere — não que a página mudou.",
      },
      share: {
        title: "Share",
        body: "Selecione registos existentes e partilhe-os num link. Sem captura extra.",
      },
    },
    costNote: "Uma captura usa uma Observation mensal. Compare e Share não usam nenhuma.",
    primaryCta: "Criar a primeira Observation",
    skip: "Mais tarde",
    helpLink: "Tour e vídeos em Ajuda",
    checklistTitle: "Primeiro passo",
    checklistBody:
      "Ainda não tem uma Observation. Escolha um URL e uma região para registar o que apareceu nesse momento.",
    checklistCta: "Tentar por região",
    regionHint: "Este é o primeiro passo. Escolha um URL e uma região para registar.",
    dialogAria: "Como começar",
    languageLabel: "Idioma",
  },
  it: {
    kicker: "Per iniziare",
    title: "Come iniziare",
    intro:
      "Il percorso è Observe → Observe again → Compare → Share. Scegli un URL e una regione, poi conserva una Observation.",
    steps: {
      observe: {
        title: "Observe",
        body: "Usa Prova per regione. Scegli URL e regione. Una regione = una Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Esegui di nuovo lo stesso URL e la stessa regione per conservare un secondo istante.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare e Region Compare sono assi distinti. Gli screenshot sono solo Same / Changed / Not comparable. Changed significa che il contenuto dell’immagine differisce, non che la pagina è cambiata.",
      },
      share: {
        title: "Share",
        body: "Seleziona record esistenti e condividili con un link. Nessuna cattura extra.",
      },
    },
    costNote: "Una cattura usa una Observation mensile. Compare e Share non ne usano.",
    primaryCta: "Crea la prima Observation",
    skip: "Più tardi",
    helpLink: "Tour e video in Guida",
    checklistTitle: "Primo passo",
    checklistBody:
      "Non hai ancora un’Observation. Scegli URL e regione per registrare ciò che era visibile in quel momento.",
    checklistCta: "Prova per regione",
    regionHint: "Questo è il primo passo. Scegli URL e regione da registrare.",
    dialogAria: "Come iniziare",
    languageLabel: "Lingua",
  },
  nl: {
    kicker: "Aan de slag",
    title: "Zo begin je",
    intro:
      "De lus is Observe → Observe again → Compare → Share. Kies een URL en regio en bewaar één Observation.",
    steps: {
      observe: {
        title: "Observe",
        body: "Gebruik Proberen per regio. Kies een URL en regio. Eén regio = één Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Voer dezelfde URL en regio opnieuw uit om een tweede tijdstip te bewaren.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare en Region Compare zijn aparte assen. Screenshots zijn alleen Same / Changed / Not comparable. Changed betekent dat de afbeelding verschilt — niet dat de pagina is veranderd.",
      },
      share: {
        title: "Share",
        body: "Selecteer bestaande records en deel ze via één link. Geen extra capture.",
      },
    },
    costNote: "Een capture gebruikt één maandelijkse Observation. Compare en Share gebruiken er geen.",
    primaryCta: "Maak je eerste Observation",
    skip: "Later",
    helpLink: "Rondleiding en video’s in Help",
    checklistTitle: "Eerste stap",
    checklistBody:
      "Je hebt nog geen Observation. Kies een URL en regio om vast te leggen wat toen werd weergegeven.",
    checklistCta: "Proberen per regio",
    regionHint: "Dit is de eerste stap. Kies een URL en regio om vast te leggen.",
    dialogAria: "Zo begin je",
    languageLabel: "Taal",
  },
  pl: {
    kicker: "Pierwsze kroki",
    title: "Jak zacząć",
    intro:
      "Przepływ to Observe → Observe again → Compare → Share. Wybierz URL i region, potem zapisz jedną Observation.",
    steps: {
      observe: {
        title: "Observe",
        body: "Użyj Wypróbuj według regionu. Wybierz URL i region. Jeden region = jedna Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Uruchom ten sam URL i region ponownie, aby zapisać drugi znacznik czasu.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare i Region Compare to osobne osie. Zrzuty to tylko Same / Changed / Not comparable. Changed oznacza różnicę w obrazie — nie to, że strona się zmieniła.",
      },
      share: {
        title: "Share",
        body: "Wybierz istniejące rekordy i udostępnij je jednym linkiem. Bez dodatkowego zrzutu.",
      },
    },
    costNote: "Zrzut zużywa jedną miesięczną Observation. Compare i Share nie zużywają.",
    primaryCta: "Utwórz pierwszą Observation",
    skip: "Później",
    helpLink: "Przewodnik i filmy w Pomocy",
    checklistTitle: "Pierwszy krok",
    checklistBody:
      "Nie masz jeszcze Observation. Wybierz URL i region, aby zapisać to, co było wtedy widoczne.",
    checklistCta: "Wypróbuj według regionu",
    regionHint: "To pierwszy krok. Wybierz URL i region do zapisu.",
    dialogAria: "Jak zacząć",
    languageLabel: "Język",
  },
  sv: {
    kicker: "Kom igång",
    title: "Så här börjar du",
    intro:
      "Flödet är Observe → Observe again → Compare → Share. Välj en URL och region och spara en Observation.",
    steps: {
      observe: {
        title: "Observe",
        body: "Använd Testa per region. Välj URL och region. En region = en Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Kör samma URL och region igen för att spara en andra tidpunkt.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare och Region Compare är skilda axlar. Skärmbilder är bara Same / Changed / Not comparable. Changed betyder att bildinnehållet skiljer sig — inte att sidan ändrades.",
      },
      share: {
        title: "Share",
        body: "Välj befintliga poster och dela dem med en länk. Ingen extra capture.",
      },
    },
    costNote: "En capture använder en månatlig Observation. Compare och Share använder ingen.",
    primaryCta: "Skapa din första Observation",
    skip: "Senare",
    helpLink: "Guiden och videor i Hjälp",
    checklistTitle: "Första steget",
    checklistBody:
      "Du har ingen Observation ännu. Välj URL och region för att spara vad som visades då.",
    checklistCta: "Testa per region",
    regionHint: "Detta är första steget. Välj URL och region att spara.",
    dialogAria: "Så här börjar du",
    languageLabel: "Språk",
  },
  tr: {
    kicker: "Başlarken",
    title: "Nasıl başlanır",
    intro:
      "Akış Observe → Observe again → Compare → Share. Bir URL ve bölge seçip bir Observation kaydedin.",
    steps: {
      observe: {
        title: "Observe",
        body: "Bölgeye göre dene’yi kullanın. URL ve bölge seçin. 1 bölge = 1 Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Aynı URL ve bölgeyi yeniden çalıştırınca ikinci bir zaman damgası kalır.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare ve Region Compare ayrı eksenlerdir. Ekran görüntüleri yalnızca Same / Changed / Not comparable. Changed, görüntü içeriğinin farklı olduğu anlamına gelir; sayfanın değiştiği anlamına gelmez.",
      },
      share: {
        title: "Share",
        body: "Mevcut kayıtları seçip tek bir bağlantıyla paylaşın. Ek çekim yoktur.",
      },
    },
    costNote: "Bir çekim aylık 1 Observation kullanır. Compare ve Share kullanmaz.",
    primaryCta: "İlk Observation’ı oluştur",
    skip: "Sonra",
    helpLink: "Tur ve videolar Yardım’da",
    checklistTitle: "İlk adım",
    checklistBody:
      "Henüz Observation yok. O anda ne göründüğünü kaydetmek için URL ve bölge seçin.",
    checklistCta: "Bölgeye göre dene",
    regionHint: "Bu ilk adımdır. Kaydetmek için URL ve bölge seçin.",
    dialogAria: "Nasıl başlanır",
    languageLabel: "Dil",
  },
  ru: {
    kicker: "С чего начать",
    title: "Как начать",
    intro:
      "Цепочка: Observe → Observe again → Compare → Share. Выберите URL и регион и сохраните одну Observation.",
    steps: {
      observe: {
        title: "Observe",
        body: "Используйте Попробовать по региону. Выберите URL и регион. 1 регион = 1 Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Повторите тот же URL и регион, чтобы сохранить вторую метку времени.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare и Region Compare — разные оси. Скриншоты только Same / Changed / Not comparable. Changed значит, что содержимое изображения отличается, а не что страница изменилась.",
      },
      share: {
        title: "Share",
        body: "Выберите существующие записи и отправьте их одной ссылкой. Дополнительной съёмки нет.",
      },
    },
    costNote: "Съёмка тратит одну Observation в месяц. Compare и Share не тратят.",
    primaryCta: "Создать первую Observation",
    skip: "Позже",
    helpLink: "Тур и видео в Справке",
    checklistTitle: "Первый шаг",
    checklistBody:
      "У вас ещё нет Observation. Выберите URL и регион, чтобы записать, что отображалось в тот момент.",
    checklistCta: "Попробовать по региону",
    regionHint: "Это первый шаг. Выберите URL и регион для записи.",
    dialogAria: "Как начать",
    languageLabel: "Язык",
  },
  ar: {
    kicker: "البداية",
    title: "كيف تبدأ",
    intro:
      "المسار هو Observe → Observe again → Compare → Share. اختر عنوان URL ومنطقة واحفظ Observation واحدة.",
    steps: {
      observe: {
        title: "Observe",
        body: "استخدم التجربة حسب المنطقة. اختر عنوان URL ومنطقة. منطقة واحدة = Observation واحدة.",
      },
      observeAgain: {
        title: "Observe again",
        body: "أعد تشغيل نفس العنوان والمنطقة لتحفظ طابعًا زمنيًا ثانيًا.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare و Region Compare محوران منفصلان. لقطات الشاشة فقط Same / Changed / Not comparable. Changed تعني اختلاف محتوى الصورة، لا أن الصفحة تغيّرت.",
      },
      share: {
        title: "Share",
        body: "اختر سجلات موجودة وشاركها برابط واحد. بلا التقاط إضافي.",
      },
    },
    costNote: "الالتقاط يستهلك Observation واحدة شهريًا. Compare و Share لا يستهلكان.",
    primaryCta: "أنشئ أول Observation",
    skip: "لاحقًا",
    helpLink: "الجولة والفيديو في المساعدة",
    checklistTitle: "الخطوة الأولى",
    checklistBody: "لا توجد Observation بعد. اختر عنوان URL ومنطقة لتسجيل ما ظهر في ذلك الوقت.",
    checklistCta: "جرّب حسب المنطقة",
    regionHint: "هذه الخطوة الأولى. اختر عنوان URL ومنطقة للتسجيل.",
    dialogAria: "كيف تبدأ",
    languageLabel: "اللغة",
  },
  hi: {
    kicker: "शुरुआत",
    title: "कैसे शुरू करें",
    intro:
      "क्रम Observe → Observe again → Compare → Share है। URL और क्षेत्र चुनें, फिर एक Observation रखें।",
    steps: {
      observe: {
        title: "Observe",
        body: "क्षेत्र से आज़माएँ का उपयोग करें। URL और क्षेत्र चुनें। एक क्षेत्र = एक Observation।",
      },
      observeAgain: {
        title: "Observe again",
        body: "वही URL और क्षेत्र फिर चलाएँ, तो दूसरा समय-चिह्न बचता है।",
      },
      compare: {
        title: "Compare",
        body: "Time Compare और Region Compare अलग अक्ष हैं। स्क्रीनशॉट केवल Same / Changed / Not comparable हैं। Changed का अर्थ है छवि सामग्री अलग है — यह नहीं कि पृष्ठ बदल गया।",
      },
      share: {
        title: "Share",
        body: "मौजूदा रिकॉर्ड चुनकर एक लिंक से बाँटें। कोई अतिरिक्त कैप्चर नहीं।",
      },
    },
    costNote: "एक कैप्चर मासिक एक Observation खर्च करता है। Compare और Share नहीं खर्च करते।",
    primaryCta: "पहली Observation बनाएँ",
    skip: "बाद में",
    helpLink: "टूर और वीडियो मदद में",
    checklistTitle: "पहला कदम",
    checklistBody: "अभी कोई Observation नहीं है। उस समय क्या दिखा, यह रिकॉर्ड करने के लिए URL और क्षेत्र चुनें।",
    checklistCta: "क्षेत्र से आज़माएँ",
    regionHint: "यह पहला कदम है। रिकॉर्ड करने के लिए URL और क्षेत्र चुनें।",
    dialogAria: "कैसे शुरू करें",
    languageLabel: "भाषा",
  },
  id: {
    kicker: "Mulai",
    title: "Cara memulai",
    intro:
      "Alurnya Observe → Observe again → Compare → Share. Pilih URL dan wilayah, lalu simpan satu Observation.",
    steps: {
      observe: {
        title: "Observe",
        body: "Gunakan Coba per wilayah. Pilih URL dan wilayah. Satu wilayah = satu Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Jalankan URL dan wilayah yang sama lagi untuk menyimpan stempel waktu kedua.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare dan Region Compare adalah sumbu terpisah. Screenshot hanya Same / Changed / Not comparable. Changed berarti isi gambar berbeda — bukan bahwa halaman berubah.",
      },
      share: {
        title: "Share",
        body: "Pilih catatan yang ada dan bagikan dalam satu tautan. Tidak ada pengambilan tambahan.",
      },
    },
    costNote: "Satu pengambilan memakai satu Observation bulanan. Compare dan Share tidak memakai.",
    primaryCta: "Buat Observation pertama",
    skip: "Nanti",
    helpLink: "Tur dan video di Bantuan",
    checklistTitle: "Langkah pertama",
    checklistBody:
      "Anda belum punya Observation. Pilih URL dan wilayah untuk merekam tampilan pada saat itu.",
    checklistCta: "Coba per wilayah",
    regionHint: "Ini langkah pertama. Pilih URL dan wilayah untuk direkam.",
    dialogAria: "Cara memulai",
    languageLabel: "Bahasa",
  },
  th: {
    kicker: "เริ่มต้น",
    title: "วิธีเริ่มใช้งาน",
    intro:
      "ลำดับคือ Observe → Observe again → Compare → Share เลือก URL และภูมิภาค แล้วเก็บ Observation หนึ่งรายการ",
    steps: {
      observe: {
        title: "Observe",
        body: "ใช้ ลองตามภูมิภาค เลือก URL และภูมิภาค 1 ภูมิภาค = 1 Observation",
      },
      observeAgain: {
        title: "Observe again",
        body: "รัน URL และภูมิภาคเดิมอีกครั้ง จะได้บันทึกเวลาที่สอง",
      },
      compare: {
        title: "Compare",
        body: "Time Compare กับ Region Compare เป็นคนละแกน สกรีนช็อตมีแค่ Same / Changed / Not comparable Changed หมายถึงเนื้อหาภาพต่างกัน ไม่ได้แปลว่าหน้าเว็บเปลี่ยน",
      },
      share: {
        title: "Share",
        body: "เลือกบันทึกที่มีอยู่แล้วแชร์เป็นลิงก์เดียว ไม่มีการถ่ายเพิ่ม",
      },
    },
    costNote: "การถ่ายใช้ Observation รายเดือน 1 ครั้ง Compare / Share ไม่ใช้",
    primaryCta: "สร้าง Observation แรก",
    skip: "ไว้ก่อน",
    helpLink: "ทัวร์และวิดีโอในความช่วยเหลือ",
    checklistTitle: "ขั้นตอนแรก",
    checklistBody: "ยังไม่มี Observation เลือก URL และภูมิภาคเพื่อบันทึกสิ่งที่แสดง ณ เวลานั้น",
    checklistCta: "ลองตามภูมิภาค",
    regionHint: "นี่คือขั้นตอนแรก เลือก URL และภูมิภาคเพื่อบันทึก",
    dialogAria: "วิธีเริ่มใช้งาน",
    languageLabel: "ภาษา",
  },
  vi: {
    kicker: "Bắt đầu",
    title: "Cách bắt đầu",
    intro:
      "Luồng là Observe → Observe again → Compare → Share. Chọn URL và khu vực, rồi lưu một Observation.",
    steps: {
      observe: {
        title: "Observe",
        body: "Dùng Thử theo khu vực. Chọn URL và khu vực. Một khu vực = một Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Chạy lại cùng URL và khu vực để lưu mốc thời gian thứ hai.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare và Region Compare là hai trục khác nhau. Ảnh chụp chỉ Same / Changed / Not comparable. Changed nghĩa là nội dung ảnh khác — không phải trang đã đổi.",
      },
      share: {
        title: "Share",
        body: "Chọn bản ghi có sẵn và chia sẻ bằng một liên kết. Không chụp thêm.",
      },
    },
    costNote: "Một lần chụp dùng một Observation mỗi tháng. Compare và Share không dùng.",
    primaryCta: "Tạo Observation đầu tiên",
    skip: "Để sau",
    helpLink: "Tour và video trong Trợ giúp",
    checklistTitle: "Bước đầu",
    checklistBody:
      "Bạn chưa có Observation. Chọn URL và khu vực để ghi lại những gì hiển thị lúc đó.",
    checklistCta: "Thử theo khu vực",
    regionHint: "Đây là bước đầu. Chọn URL và khu vực để ghi.",
    dialogAria: "Cách bắt đầu",
    languageLabel: "Ngôn ngữ",
  },
};

export function isOnboardingLang(value: string): value is OnboardingLang {
  return ONBOARDING_LANGS.some((lang) => lang.id === value);
}

export function getOnboardingCopy(lang: string): OnboardingCopy {
  return isOnboardingLang(lang) ? onboardingCopy[lang] : onboardingCopy.en;
}
