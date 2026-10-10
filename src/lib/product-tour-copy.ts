import { isOnboardingLang, type OnboardingLang } from "@/lib/onboarding-copy";

export type PRODUCT_TOUR_UI = {
  tourTitle: string;
  tourIntro: string;
  startTour: string;
  close: string;
  next: string;
  back: string;
  done: string;
  stepOf: string;
  languageLabel: string;
  skip: string;
};

export type ProductTourStepCopy = {
  title: string;
  body: string;
};

export type ProductTourCopy = {
  ui: PRODUCT_TOUR_UI;
  steps: {
    loop: ProductTourStepCopy;
    observe: ProductTourStepCopy;
    observeAgain: ProductTourStepCopy;
    records: ProductTourStepCopy;
    recordsScreen: ProductTourStepCopy;
    recordDetail: ProductTourStepCopy;
    recordScreen: ProductTourStepCopy;
    compare: ProductTourStepCopy;
    share: ProductTourStepCopy;
  };
};

const en: ProductTourCopy = {
  ui: {
    tourTitle: "Product tour",
    tourIntro:
      "The loop is Observe → Observe again → Compare → Share. A record is the fact of a URL × region × time.",
    startTour: "Start tour",
    close: "Close",
    next: "Next",
    back: "Back",
    done: "Done",
    stepOf: "{current} / {total}",
    languageLabel: "Language",
    skip: "Later",
  },
  steps: {
    loop: {
      title: "The recording loop",
      body: "Observation is the product. Choose a URL and region, then keep what rendered at that time. Compare and Share run on records you already have.",
    },
    observe: {
      title: "Observe",
      body: "Use Try by region or New observation. Pick a URL and region. One region = one Observation.",
    },
    observeAgain: {
      title: "Observe again",
      body: "Run the same URL and region again to keep a second timestamp. That pair is what Time Compare uses.",
    },
    records: {
      title: "Observations list",
      body: "Search this page by URL, region, or tag. A tag is saved on every record of that URL. Screenshots are removed after the plan window; metadata remains.",
    },
    recordsScreen: {
      title: "How to read this screen",
      body: "Search is URL, page title, region, or tag. Chips filter by tag. Share Collection turns selected existing records into one link—no new capture. The table shows capture time, URL, region, status, tags, and Details.",
    },
    recordDetail: {
      title: "Open the result with Details",
      body: "Press Details on a row to open that Observation. You will see the screenshot and record from capture time.",
    },
    recordScreen: {
      title: "How to read this result",
      body: "One Observation is the record of a URL × region × time. Requested and Observed stay separate. The screenshot is what rendered at capture time. Page Signals is an indicative html_signals score — not Observed. The confirmation record seal is a reference record, not third-party verification. Monitoring on Starter / Pro uses one Observation per scheduled run. Compare, Share, and CSV use existing records only.",
    },
    compare: {
      title: "Compare",
      body: "Time Compare and Region Compare are separate axes. Screenshots are only Same / Changed / Not comparable. Changed means the screenshot content differs—not that the page changed.",
    },
    share: {
      title: "Share",
      body: "Select records and create a Share Collection to deliver existing Observations on one public link. No extra capture.",
    },
  },
};

export const DEFAULT = en;

export const productTourCopy: Record<OnboardingLang, ProductTourCopy> = {
  en,
  ja: {
    ui: {
      tourTitle: "プロダクトツアー",
      tourIntro:
        "流れは Observe → Observe again → Compare → Share です。記録は URL × 地域 × 時点の事実です。",
      startTour: "ツアーを開始",
      close: "閉じる",
      next: "次へ",
      back: "戻る",
      done: "完了",
      stepOf: "{current} / {total}",
      languageLabel: "言語",
      skip: "あとで",
    },
    steps: {
      loop: {
        title: "記録の流れ",
        body: "Viewtrace は Observation が本体です。URL と地域を選び、その時点の表示を記録します。比較と共有は既存の記録の上で行います。",
      },
      observe: {
        title: "観測する",
        body: "「地域で試す」または新規オブザベーションで URL と地域を指定します。1 地域 = 1 Observation です。",
      },
      observeAgain: {
        title: "もう一度観測する",
        body: "同じ URL と地域でもう一度実行すると、時点の違う 2 件目が残ります。Time Compare に使えます。",
      },
      records: {
        title: "オブザベーション一覧",
        body: "このページでは URL・地域・タグで記録を探せます。タグはその URL の記録すべてに保存されます。スクリーンショットはプランの保存期間後に削除され、メタデータは残ります。",
      },
      recordsScreen: {
        title: "この画面の見方",
        body: "検索は URL・ページ名・地域・タグです。下のチップでタグを絞ります。Share Collection は既存の記録を選んで 1 リンクにします。新しい撮影はありません。表は取得時刻・URL・地域・ステータス・タグ・詳細です。",
      },
      recordDetail: {
        title: "詳細で結果を見る",
        body: "行の「詳細」を押すと、その Observation の結果が開きます。取得時点のスクリーンショットと記録を確認できます。",
      },
      recordScreen: {
        title: "この結果画面の見方",
        body: "1 件の Observation は URL × 地域 × 時点の記録です。Requested と Observed は分けます。スクリーンショットは取得時点の表示です。Page Signals は html_signals の参考スコアで、Observed ではありません。確認記録シールは参照用であり、第三者検証や証明の代替ではありません。自動観測は Starter / Pro で、1 実行 = 1 Observation です。Compare / Share / CSV は既存記録だけを使います。",
      },
      compare: {
        title: "比較する",
        body: "Time Compare と Region Compare は別軸です。Screenshot は Same / Changed / Not comparable だけです。Changed は画像の差であり、ページが変わったとは言いません。",
      },
      share: {
        title: "共有する",
        body: "記録を選んで Share Collection を作ると、既存 Observation を 1 本の公開リンクで渡せます。追加の撮影はありません。",
      },
    },
  },
  ko: {
    ui: {
      tourTitle: "제품 투어",
      tourIntro:
        "흐름은 Observe → Observe again → Compare → Share 입니다. 기록은 URL × 지역 × 시점의 사실입니다.",
      startTour: "투어 시작",
      close: "닫기",
      next: "다음",
      back: "뒤로",
      done: "완료",
      stepOf: "{current} / {total}",
      languageLabel: "언어",
      skip: "나중에",
    },
    steps: {
      loop: {
        title: "기록의 흐름",
        body: "Observation이 제품입니다. URL과 지역을 고른 뒤, 그 시점에 렌더된 표시를 남깁니다. Compare와 Share는 이미 있는 기록 위에서 실행합니다.",
      },
      observe: {
        title: "Observe",
        body: "지역으로 시도 또는 새 Observation에서 URL과 지역을 지정합니다. 지역 1곳 = Observation 1건입니다.",
      },
      observeAgain: {
        title: "Observe again",
        body: "같은 URL과 지역을 다시 실행하면 시점이 다른 두 번째 기록이 남습니다. 그 쌍이 Time Compare에 쓰입니다.",
      },
      records: {
        title: "Observations 목록",
        body: "이 페이지에서 URL, 지역, 태그로 검색합니다. 태그는 그 URL의 모든 기록에 저장됩니다. 스크린샷은 플랜 기간 후 삭제되고, 메타데이터는 남습니다.",
      },
      recordsScreen: {
        title: "이 화면 보는 법",
        body: "검색은 URL, 페이지 제목, 지역, 태그입니다. 칩으로 태그를 필터합니다. Share Collection은 선택한 기존 기록을 링크 하나로 만듭니다. 새 촬영은 없습니다. 표는 촬영 시각, URL, 지역, 상태, 태그, Details입니다.",
      },
      recordDetail: {
        title: "Details로 결과 열기",
        body: "행의 Details를 누르면 그 Observation이 열립니다. 촬영 시점의 스크린샷과 기록을 봅니다.",
      },
      recordScreen: {
        title: "이 결과 보는 법",
        body: "Observation 한 건은 URL × 지역 × 시점의 기록입니다. Requested와 Observed는 나눕니다. 스크린샷은 촬영 시점의 표시입니다. Page Signals는 html_signals의 참고 점수이며 Observed가 아닙니다. 확인 기록 봉인은 참조용 기록이며 제3자 검증이 아닙니다. Starter / Pro의 Monitoring은 예약 실행당 Observation 1건을 씁니다. Compare, Share, CSV는 기존 기록만 사용합니다.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare와 Region Compare는 다른 축입니다. 스크린샷은 Same / Changed / Not comparable 뿐입니다. Changed는 이미지 차이이며, 페이지가 바뀌었다고 말하지 않습니다.",
      },
      share: {
        title: "Share",
        body: "기록을 골라 Share Collection을 만들면 기존 Observation을 공개 링크 하나로 전달합니다. 추가 촬영은 없습니다.",
      },
    },
  },
  "zh-Hans": {
    ui: {
      tourTitle: "产品导览",
      tourIntro: "流程是 Observe → Observe again → Compare → Share。记录是 URL × 地区 × 时间点的事实。",
      startTour: "开始导览",
      close: "关闭",
      next: "下一步",
      back: "返回",
      done: "完成",
      stepOf: "{current} / {total}",
      languageLabel: "语言",
      skip: "稍后",
    },
    steps: {
      loop: {
        title: "记录流程",
        body: "Observation 就是产品本身。选择 URL 和地区，留下当时渲染的显示。Compare 和 Share 在已有记录上进行。",
      },
      observe: {
        title: "Observe",
        body: "在按地区尝试或新建 Observation 中指定 URL 和地区。1 个地区 = 1 条 Observation。",
      },
      observeAgain: {
        title: "Observe again",
        body: "对同一 URL 和地区再执行一次，会留下时间点不同的第 2 条记录。Time Compare 使用这一对。",
      },
      records: {
        title: "Observations 列表",
        body: "可按 URL、地区或标签搜索本页。标签会保存在该 URL 的每条记录上。截图在套餐保存期后删除，元数据保留。",
      },
      recordsScreen: {
        title: "如何阅读此屏幕",
        body: "搜索范围是 URL、页面标题、地区或标签。芯片按标签筛选。Share Collection 把所选已有记录合成一条链接——不会再次拍摄。表格显示拍摄时间、URL、地区、状态、标签和 Details。",
      },
      recordDetail: {
        title: "用 Details 打开结果",
        body: "点击一行的 Details 即可打开该 Observation。你会看到拍摄时的截图和记录。",
      },
      recordScreen: {
        title: "如何阅读此结果",
        body: "1 条 Observation 是 URL × 地区 × 时间点的记录。Requested 与 Observed 分开。截图是拍摄时的显示。Page Signals 是 html_signals 的参考分数，不是 Observed。确认记录印章是参考记录，不是第三方验证。Starter / Pro 的 Monitoring 每次计划执行使用 1 条 Observation。Compare、Share 和 CSV 只使用已有记录。",
      },
      compare: {
        title: "Compare",
        body: "Time Compare 与 Region Compare 是不同轴。截图只有 Same / Changed / Not comparable。Changed 表示图像内容不同，不是说页面变了。",
      },
      share: {
        title: "Share",
        body: "选择记录并创建 Share Collection，即可用一条公开链接交付已有 Observation。不会再次拍摄。",
      },
    },
  },
  "zh-Hant": {
    ui: {
      tourTitle: "產品導覽",
      tourIntro: "流程是 Observe → Observe again → Compare → Share。紀錄是 URL × 地區 × 時間點的事實。",
      startTour: "開始導覽",
      close: "關閉",
      next: "下一步",
      back: "返回",
      done: "完成",
      stepOf: "{current} / {total}",
      languageLabel: "語言",
      skip: "稍後",
    },
    steps: {
      loop: {
        title: "紀錄流程",
        body: "Observation 就是產品本身。選擇 URL 和地區，留下當時渲染的顯示。Compare 和 Share 在既有紀錄上進行。",
      },
      observe: {
        title: "Observe",
        body: "在依地區嘗試或新增 Observation 中指定 URL 和地區。1 個地區 = 1 筆 Observation。",
      },
      observeAgain: {
        title: "Observe again",
        body: "對同一 URL 和地區再執行一次，會留下時間點不同的第 2 筆紀錄。Time Compare 使用這一對。",
      },
      records: {
        title: "Observations 列表",
        body: "可依 URL、地區或標籤搜尋本頁。標籤會保存在該 URL 的每筆紀錄上。截圖在方案保存期後刪除，中繼資料保留。",
      },
      recordsScreen: {
        title: "如何閱讀此畫面",
        body: "搜尋範圍是 URL、頁面標題、地區或標籤。晶片依標籤篩選。Share Collection 把所選既有紀錄合成一條連結——不會再次拍攝。表格顯示拍攝時間、URL、地區、狀態、標籤和 Details。",
      },
      recordDetail: {
        title: "用 Details 開啟結果",
        body: "點一列的 Details 即可開啟該 Observation。你會看到拍攝時的截圖和紀錄。",
      },
      recordScreen: {
        title: "如何閱讀此結果",
        body: "1 筆 Observation 是 URL × 地區 × 時間點的紀錄。Requested 與 Observed 分開。截圖是拍攝時的顯示。Page Signals 是 html_signals 的參考分數，不是 Observed。確認紀錄印章是參考紀錄，不是第三方驗證。Starter / Pro 的 Monitoring 每次排程執行使用 1 筆 Observation。Compare、Share 和 CSV 只使用既有紀錄。",
      },
      compare: {
        title: "Compare",
        body: "Time Compare 與 Region Compare 是不同軸。截圖只有 Same / Changed / Not comparable。Changed 表示圖像內容不同，不是說頁面變了。",
      },
      share: {
        title: "Share",
        body: "選擇紀錄並建立 Share Collection，即可用一條公開連結交付既有 Observation。不會再次拍攝。",
      },
    },
  },
  es: {
    ui: {
      tourTitle: "Tour del producto",
      tourIntro:
        "El flujo es Observe → Observe again → Compare → Share. Un registro es el hecho de una URL × región × momento.",
      startTour: "Empezar el tour",
      close: "Cerrar",
      next: "Siguiente",
      back: "Atrás",
      done: "Listo",
      stepOf: "{current} / {total}",
      languageLabel: "Idioma",
      skip: "Más tarde",
    },
    steps: {
      loop: {
        title: "El bucle de registro",
        body: "Observation es el producto. Elige una URL y una región, y guarda lo que se renderizó en ese momento. Compare y Share se ejecutan sobre registros que ya tienes.",
      },
      observe: {
        title: "Observe",
        body: "Usa Probar por región o Nueva Observation. Elige una URL y una región. Una región = una Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Vuelve a ejecutar la misma URL y región para guardar un segundo instante. Ese par es lo que usa Time Compare.",
      },
      records: {
        title: "Lista de Observations",
        body: "Busca en esta página por URL, región o etiqueta. Una etiqueta se guarda en cada registro de esa URL. Las capturas se eliminan tras la ventana del plan; los metadatos permanecen.",
      },
      recordsScreen: {
        title: "Cómo leer esta pantalla",
        body: "La búsqueda es URL, título de página, región o etiqueta. Los chips filtran por etiqueta. Share Collection convierte los registros existentes seleccionados en un enlace—sin captura nueva. La tabla muestra hora de captura, URL, región, estado, etiquetas y Details.",
      },
      recordDetail: {
        title: "Abrir el resultado con Details",
        body: "Pulsa Details en una fila para abrir esa Observation. Verás la captura y el registro del momento de la toma.",
      },
      recordScreen: {
        title: "Cómo leer este resultado",
        body: "Una Observation es el registro de una URL × región × momento. Requested y Observed se mantienen separados. La captura es lo que se renderizó en el momento de la toma. Page Signals es una puntuación indicativa de html_signals — no es Observed. El sello de registro de confirmación es un registro de referencia, no una verificación de terceros. Monitoring en Starter / Pro usa una Observation por ejecución programada. Compare, Share y CSV usan solo registros existentes.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare y Region Compare son ejes distintos. Las capturas solo son Same / Changed / Not comparable. Changed significa que el contenido de la imagen difiere, no que la página cambió.",
      },
      share: {
        title: "Share",
        body: "Selecciona registros y crea un Share Collection para entregar Observations existentes en un enlace público. Sin captura extra.",
      },
    },
  },
  fr: {
    ui: {
      tourTitle: "Visite du produit",
      tourIntro:
        "Le parcours est Observe → Observe again → Compare → Share. Un enregistrement est le fait d’une URL × région × instant.",
      startTour: "Démarrer la visite",
      close: "Fermer",
      next: "Suivant",
      back: "Retour",
      done: "Terminé",
      stepOf: "{current} / {total}",
      languageLabel: "Langue",
      skip: "Plus tard",
    },
    steps: {
      loop: {
        title: "La boucle d’enregistrement",
        body: "Observation est le produit. Choisissez une URL et une région, puis conservez ce qui s’est affiché à cet instant. Compare et Share s’exécutent sur les enregistrements déjà présents.",
      },
      observe: {
        title: "Observe",
        body: "Utilisez Essayer par région ou Nouvelle Observation. Choisissez une URL et une région. Une région = une Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Relancez la même URL et la même région pour garder un second horodatage. Cette paire est ce que Time Compare utilise.",
      },
      records: {
        title: "Liste des Observations",
        body: "Recherchez sur cette page par URL, région ou tag. Un tag est enregistré sur chaque enregistrement de cette URL. Les captures sont retirées après la fenêtre du forfait ; les métadonnées restent.",
      },
      recordsScreen: {
        title: "Comment lire cet écran",
        body: "La recherche porte sur l’URL, le titre de page, la région ou le tag. Les puces filtrent par tag. Share Collection transforme les enregistrements existants sélectionnés en un lien — pas de nouvelle capture. Le tableau affiche l’heure de capture, l’URL, la région, le statut, les tags et Details.",
      },
      recordDetail: {
        title: "Ouvrir le résultat avec Details",
        body: "Appuyez sur Details d’une ligne pour ouvrir cette Observation. Vous verrez la capture et l’enregistrement du moment de la prise.",
      },
      recordScreen: {
        title: "Comment lire ce résultat",
        body: "Une Observation est l’enregistrement d’une URL × région × instant. Requested et Observed restent séparés. La capture est ce qui s’est affiché au moment de la prise. Page Signals est un score indicatif html_signals — ce n’est pas Observed. Le sceau d’enregistrement de confirmation est un enregistrement de référence, pas une vérification tierce. Monitoring sur Starter / Pro utilise une Observation par exécution planifiée. Compare, Share et CSV n’utilisent que des enregistrements existants.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare et Region Compare sont des axes distincts. Les captures sont uniquement Same / Changed / Not comparable. Changed signifie que le contenu de l’image diffère — pas que la page a changé.",
      },
      share: {
        title: "Share",
        body: "Sélectionnez des enregistrements et créez un Share Collection pour livrer des Observations existantes via un lien public. Pas de capture supplémentaire.",
      },
    },
  },
  de: {
    ui: {
      tourTitle: "Produkttour",
      tourIntro:
        "Der Ablauf ist Observe → Observe again → Compare → Share. Ein Datensatz ist die Tatsache einer URL × Region × Zeit.",
      startTour: "Tour starten",
      close: "Schließen",
      next: "Weiter",
      back: "Zurück",
      done: "Fertig",
      stepOf: "{current} / {total}",
      languageLabel: "Sprache",
      skip: "Später",
    },
    steps: {
      loop: {
        title: "Die Aufzeichnungsschleife",
        body: "Observation ist das Produkt. Wählen Sie eine URL und eine Region und behalten Sie, was zu diesem Zeitpunkt gerendert wurde. Compare und Share laufen auf Datensätzen, die Sie bereits haben.",
      },
      observe: {
        title: "Observe",
        body: "Nutzen Sie Nach Region testen oder Neue Observation. Wählen Sie URL und Region. Eine Region = eine Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Dieselbe URL und Region erneut ausführen, um einen zweiten Zeitpunkt zu behalten. Dieses Paar nutzt Time Compare.",
      },
      records: {
        title: "Observations-Liste",
        body: "Durchsuchen Sie diese Seite nach URL, Region oder Tag. Ein Tag wird auf jedem Datensatz dieser URL gespeichert. Screenshots werden nach dem Planfenster entfernt; Metadaten bleiben.",
      },
      recordsScreen: {
        title: "So lesen Sie diesen Bildschirm",
        body: "Die Suche umfasst URL, Seitentitel, Region oder Tag. Chips filtern nach Tag. Share Collection macht aus ausgewählten vorhandenen Datensätzen einen Link — keine neue Aufnahme. Die Tabelle zeigt Aufnahmezeit, URL, Region, Status, Tags und Details.",
      },
      recordDetail: {
        title: "Ergebnis mit Details öffnen",
        body: "Drücken Sie Details in einer Zeile, um diese Observation zu öffnen. Sie sehen Screenshot und Datensatz vom Aufnahmezeitpunkt.",
      },
      recordScreen: {
        title: "So lesen Sie dieses Ergebnis",
        body: "Eine Observation ist der Datensatz einer URL × Region × Zeit. Requested und Observed bleiben getrennt. Der Screenshot ist das, was zum Aufnahmezeitpunkt gerendert wurde. Page Signals ist ein indikativer html_signals-Wert — nicht Observed. Das Bestätigungsdatensatz-Siegel ist ein Referenzdatensatz, keine Drittprüfung. Monitoring auf Starter / Pro verwendet eine Observation pro geplantem Lauf. Compare, Share und CSV nutzen nur vorhandene Datensätze.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare und Region Compare sind getrennte Achsen. Screenshots sind nur Same / Changed / Not comparable. Changed heißt: der Bildinhalt unterscheidet sich — nicht, dass sich die Seite geändert hat.",
      },
      share: {
        title: "Share",
        body: "Wählen Sie Datensätze und erstellen Sie eine Share Collection, um vorhandene Observations über einen öffentlichen Link zu übergeben. Keine Extra-Aufnahme.",
      },
    },
  },
  pt: {
    ui: {
      tourTitle: "Tour do produto",
      tourIntro:
        "O fluxo é Observe → Observe again → Compare → Share. Um registo é o facto de um URL × região × momento.",
      startTour: "Iniciar o tour",
      close: "Fechar",
      next: "Seguinte",
      back: "Voltar",
      done: "Concluído",
      stepOf: "{current} / {total}",
      languageLabel: "Idioma",
      skip: "Mais tarde",
    },
    steps: {
      loop: {
        title: "O ciclo de registo",
        body: "Observation é o produto. Escolha um URL e uma região e guarde o que foi renderizado nesse momento. Compare e Share correm sobre registos que já tem.",
      },
      observe: {
        title: "Observe",
        body: "Use Tentar por região ou Nova Observation. Escolha um URL e uma região. Uma região = uma Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Execute de novo o mesmo URL e região para guardar um segundo instante. Esse par é o que o Time Compare usa.",
      },
      records: {
        title: "Lista de Observations",
        body: "Pesquise nesta página por URL, região ou etiqueta. Uma etiqueta é guardada em cada registo desse URL. Os screenshots são removidos após a janela do plano; os metadados permanecem.",
      },
      recordsScreen: {
        title: "Como ler este ecrã",
        body: "A pesquisa é URL, título da página, região ou etiqueta. Os chips filtram por etiqueta. Share Collection transforma os registos existentes selecionados num link — sem captura nova. A tabela mostra hora de captura, URL, região, estado, etiquetas e Details.",
      },
      recordDetail: {
        title: "Abrir o resultado com Details",
        body: "Prima Details numa linha para abrir essa Observation. Verá o screenshot e o registo do momento da captura.",
      },
      recordScreen: {
        title: "Como ler este resultado",
        body: "Uma Observation é o registo de um URL × região × momento. Requested e Observed mantêm-se separados. O screenshot é o que foi renderizado no momento da captura. Page Signals é uma pontuação indicativa de html_signals — não é Observed. O selo de registo de confirmação é um registo de referência, não uma verificação de terceiros. Monitoring em Starter / Pro usa uma Observation por execução agendada. Compare, Share e CSV usam apenas registos existentes.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare e Region Compare são eixos separados. Os screenshots são só Same / Changed / Not comparable. Changed significa que o conteúdo da imagem difere — não que a página mudou.",
      },
      share: {
        title: "Share",
        body: "Selecione registos e crie um Share Collection para entregar Observations existentes num link público. Sem captura extra.",
      },
    },
  },
  it: {
    ui: {
      tourTitle: "Tour del prodotto",
      tourIntro:
        "Il percorso è Observe → Observe again → Compare → Share. Un record è il fatto di un URL × regione × momento.",
      startTour: "Avvia il tour",
      close: "Chiudi",
      next: "Avanti",
      back: "Indietro",
      done: "Fine",
      stepOf: "{current} / {total}",
      languageLabel: "Lingua",
      skip: "Più tardi",
    },
    steps: {
      loop: {
        title: "Il ciclo di registrazione",
        body: "Observation è il prodotto. Scegli un URL e una regione, poi conserva ciò che era renderizzato in quel momento. Compare e Share agiscono sui record che hai già.",
      },
      observe: {
        title: "Observe",
        body: "Usa Prova per regione o Nuova Observation. Scegli URL e regione. Una regione = una Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Esegui di nuovo lo stesso URL e la stessa regione per conservare un secondo istante. Quella coppia è ciò che usa Time Compare.",
      },
      records: {
        title: "Elenco Observations",
        body: "Cerca in questa pagina per URL, regione o tag. Un tag è salvato su ogni record di quell’URL. Gli screenshot vengono rimossi dopo la finestra del piano; i metadati restano.",
      },
      recordsScreen: {
        title: "Come leggere questa schermata",
        body: "La ricerca è URL, titolo della pagina, regione o tag. I chip filtrano per tag. Share Collection trasforma i record esistenti selezionati in un link — nessuna nuova cattura. La tabella mostra ora di cattura, URL, regione, stato, tag e Details.",
      },
      recordDetail: {
        title: "Apri il risultato con Details",
        body: "Premi Details su una riga per aprire quella Observation. Vedrai lo screenshot e il record del momento della cattura.",
      },
      recordScreen: {
        title: "Come leggere questo risultato",
        body: "Un’Observation è il record di un URL × regione × momento. Requested e Observed restano separati. Lo screenshot è ciò che era renderizzato al momento della cattura. Page Signals è un punteggio indicativo html_signals — non è Observed. Il sigillo di record di conferma è un record di riferimento, non una verifica di terzi. Monitoring su Starter / Pro usa un’Observation per ogni esecuzione pianificata. Compare, Share e CSV usano solo record esistenti.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare e Region Compare sono assi distinti. Gli screenshot sono solo Same / Changed / Not comparable. Changed significa che il contenuto dell’immagine differisce, non che la pagina è cambiata.",
      },
      share: {
        title: "Share",
        body: "Seleziona record e crea un Share Collection per consegnare Observation esistenti con un link pubblico. Nessuna cattura extra.",
      },
    },
  },
  nl: {
    ui: {
      tourTitle: "Productrondleiding",
      tourIntro:
        "De lus is Observe → Observe again → Compare → Share. Een record is het feit van een URL × regio × tijdstip.",
      startTour: "Rondleiding starten",
      close: "Sluiten",
      next: "Volgende",
      back: "Terug",
      done: "Klaar",
      stepOf: "{current} / {total}",
      languageLabel: "Taal",
      skip: "Later",
    },
    steps: {
      loop: {
        title: "De opnamelus",
        body: "Observation is het product. Kies een URL en regio en bewaar wat toen werd weergegeven. Compare en Share werken op records die je al hebt.",
      },
      observe: {
        title: "Observe",
        body: "Gebruik Proberen per regio of Nieuwe Observation. Kies een URL en regio. Eén regio = één Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Voer dezelfde URL en regio opnieuw uit om een tweede tijdstip te bewaren. Dat paar gebruikt Time Compare.",
      },
      records: {
        title: "Observations-lijst",
        body: "Zoek op deze pagina op URL, regio of tag. Een tag wordt op elk record van die URL bewaard. Screenshots worden na het planvenster verwijderd; metadata blijft.",
      },
      recordsScreen: {
        title: "Zo lees je dit scherm",
        body: "Zoeken is URL, paginatitel, regio of tag. Chips filteren op tag. Share Collection maakt van geselecteerde bestaande records één link — geen nieuwe capture. De tabel toont capturetijd, URL, regio, status, tags en Details.",
      },
      recordDetail: {
        title: "Open het resultaat met Details",
        body: "Druk op Details in een rij om die Observation te openen. Je ziet de screenshot en het record van het capturemoment.",
      },
      recordScreen: {
        title: "Zo lees je dit resultaat",
        body: "Eén Observation is het record van een URL × regio × tijdstip. Requested en Observed blijven gescheiden. De screenshot is wat op het capturemoment werd weergegeven. Page Signals is een indicatieve html_signals-score — geen Observed. Het bevestigingsrecordzegel is een referentierecord, geen verificatie door derden. Monitoring op Starter / Pro gebruikt één Observation per geplande run. Compare, Share en CSV gebruiken alleen bestaande records.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare en Region Compare zijn aparte assen. Screenshots zijn alleen Same / Changed / Not comparable. Changed betekent dat de afbeelding verschilt — niet dat de pagina is veranderd.",
      },
      share: {
        title: "Share",
        body: "Selecteer records en maak een Share Collection om bestaande Observations via één openbare link te leveren. Geen extra capture.",
      },
    },
  },
  pl: {
    ui: {
      tourTitle: "Przewodnik po produkcie",
      tourIntro:
        "Przepływ to Observe → Observe again → Compare → Share. Rekord to fakt URL × region × czas.",
      startTour: "Rozpocznij przewodnik",
      close: "Zamknij",
      next: "Dalej",
      back: "Wstecz",
      done: "Gotowe",
      stepOf: "{current} / {total}",
      languageLabel: "Język",
      skip: "Później",
    },
    steps: {
      loop: {
        title: "Pętla zapisu",
        body: "Observation jest produktem. Wybierz URL i region, potem zapisz to, co było wtedy wyrenderowane. Compare i Share działają na rekordach, które już masz.",
      },
      observe: {
        title: "Observe",
        body: "Użyj Wypróbuj według regionu lub Nowa Observation. Wybierz URL i region. Jeden region = jedna Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Uruchom ten sam URL i region ponownie, aby zapisać drugi znacznik czasu. Ta para jest tym, czego używa Time Compare.",
      },
      records: {
        title: "Lista Observations",
        body: "Szukaj na tej stronie według URL, regionu lub tagu. Tag jest zapisywany na każdym rekordzie tego URL. Zrzuty są usuwane po oknie planu; metadane pozostają.",
      },
      recordsScreen: {
        title: "Jak czytać ten ekran",
        body: "Wyszukiwanie to URL, tytuł strony, region lub tag. Chipy filtrują według tagu. Share Collection zamienia wybrane istniejące rekordy w jeden link — bez nowego zrzutu. Tabela pokazuje czas zrzutu, URL, region, status, tagi i Details.",
      },
      recordDetail: {
        title: "Otwórz wynik przez Details",
        body: "Naciśnij Details w wierszu, aby otworzyć tę Observation. Zobaczysz zrzut i rekord z chwili przechwycenia.",
      },
      recordScreen: {
        title: "Jak czytać ten wynik",
        body: "Jedna Observation to rekord URL × region × czas. Requested i Observed pozostają rozdzielone. Zrzut to to, co było wyrenderowane w chwili przechwycenia. Page Signals to orientacyjny wynik html_signals — nie Observed. Pieczęć rekordu potwierdzenia to rekord referencyjny, nie weryfikacja strony trzeciej. Monitoring na Starter / Pro zużywa jedną Observation na zaplanowane uruchomienie. Compare, Share i CSV używają tylko istniejących rekordów.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare i Region Compare to osobne osie. Zrzuty to tylko Same / Changed / Not comparable. Changed oznacza różnicę w obrazie — nie to, że strona się zmieniła.",
      },
      share: {
        title: "Share",
        body: "Wybierz rekordy i utwórz Share Collection, aby przekazać istniejące Observations jednym publicznym linkiem. Bez dodatkowego zrzutu.",
      },
    },
  },
  sv: {
    ui: {
      tourTitle: "Produktguide",
      tourIntro:
        "Flödet är Observe → Observe again → Compare → Share. En post är faktumet URL × region × tidpunkt.",
      startTour: "Starta guiden",
      close: "Stäng",
      next: "Nästa",
      back: "Tillbaka",
      done: "Klar",
      stepOf: "{current} / {total}",
      languageLabel: "Språk",
      skip: "Senare",
    },
    steps: {
      loop: {
        title: "Inspelningsslingan",
        body: "Observation är produkten. Välj en URL och region och spara det som renderades då. Compare och Share körs på poster du redan har.",
      },
      observe: {
        title: "Observe",
        body: "Använd Testa per region eller Ny Observation. Välj URL och region. En region = en Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Kör samma URL och region igen för att spara en andra tidpunkt. Det paret är vad Time Compare använder.",
      },
      records: {
        title: "Observationslista",
        body: "Sök på den här sidan efter URL, region eller tagg. En tagg sparas på varje post för den URL:en. Skärmbilder tas bort efter planfönstret; metadata finns kvar.",
      },
      recordsScreen: {
        title: "Så läser du den här skärmen",
        body: "Sökningen är URL, sidtitel, region eller tagg. Chips filtrerar efter tagg. Share Collection gör valda befintliga poster till en länk — ingen ny capture. Tabellen visar capturetid, URL, region, status, taggar och Details.",
      },
      recordDetail: {
        title: "Öppna resultatet med Details",
        body: "Tryck Details på en rad för att öppna den Observation. Du ser skärmbilden och posten från captureögonblicket.",
      },
      recordScreen: {
        title: "Så läser du det här resultatet",
        body: "En Observation är posten för en URL × region × tidpunkt. Requested och Observed hålls isär. Skärmbilden är det som renderades vid capture. Page Signals är en indikativ html_signals-poäng — inte Observed. Bekräftelsepostens sigill är en referenspost, inte tredjepartsverifiering. Monitoring på Starter / Pro använder en Observation per schemalagd körning. Compare, Share och CSV använder bara befintliga poster.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare och Region Compare är skilda axlar. Skärmbilder är bara Same / Changed / Not comparable. Changed betyder att bildinnehållet skiljer sig — inte att sidan ändrades.",
      },
      share: {
        title: "Share",
        body: "Välj poster och skapa en Share Collection för att lämna befintliga Observations på en offentlig länk. Ingen extra capture.",
      },
    },
  },
  tr: {
    ui: {
      tourTitle: "Ürün turu",
      tourIntro:
        "Akış Observe → Observe again → Compare → Share. Bir kayıt, bir URL × bölge × zaman gerçeğidir.",
      startTour: "Turu başlat",
      close: "Kapat",
      next: "İleri",
      back: "Geri",
      done: "Bitti",
      stepOf: "{current} / {total}",
      languageLabel: "Dil",
      skip: "Sonra",
    },
    steps: {
      loop: {
        title: "Kayıt döngüsü",
        body: "Observation üründür. Bir URL ve bölge seçip o anda render edilen görünümü saklayın. Compare ve Share, elinizdeki kayıtlar üzerinde çalışır.",
      },
      observe: {
        title: "Observe",
        body: "Bölgeye göre dene veya Yeni Observation kullanın. URL ve bölge seçin. 1 bölge = 1 Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Aynı URL ve bölgeyi yeniden çalıştırınca ikinci bir zaman damgası kalır. Time Compare bu çifti kullanır.",
      },
      records: {
        title: "Observations listesi",
        body: "Bu sayfada URL, bölge veya etiketle arayın. Etiket o URL’nin her kaydına yazılır. Ekran görüntüleri plan penceresinden sonra silinir; üst veri kalır.",
      },
      recordsScreen: {
        title: "Bu ekranı nasıl okursunuz",
        body: "Arama URL, sayfa başlığı, bölge veya etikettir. Çipler etikete göre süzgeçler. Share Collection seçili mevcut kayıtları tek bağlantı yapar — yeni çekim yoktur. Tablo çekim zamanı, URL, bölge, durum, etiketler ve Details gösterir.",
      },
      recordDetail: {
        title: "Sonucu Details ile açın",
        body: "Bir satırda Details’e basınca o Observation açılır. Çekim anındaki ekran görüntüsü ve kaydı görürsünüz.",
      },
      recordScreen: {
        title: "Bu sonucu nasıl okursunuz",
        body: "Bir Observation, bir URL × bölge × zaman kaydıdır. Requested ve Observed ayrı durur. Ekran görüntüsü çekim anında render edilen görünümdür. Page Signals, html_signals için gösterge niteliğinde bir puandır — Observed değildir. Onay kaydı mührü referans kayıttır, üçüncü taraf doğrulama değildir. Starter / Pro’da Monitoring, her zamanlanmış çalıştırmada bir Observation kullanır. Compare, Share ve CSV yalnızca mevcut kayıtları kullanır.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare ve Region Compare ayrı eksenlerdir. Ekran görüntüleri yalnızca Same / Changed / Not comparable. Changed, görüntü içeriğinin farklı olduğu anlamına gelir; sayfanın değiştiği anlamına gelmez.",
      },
      share: {
        title: "Share",
        body: "Kayıtları seçip bir Share Collection oluşturarak mevcut Observation’ları tek bir herkese açık bağlantıyla teslim edin. Ek çekim yoktur.",
      },
    },
  },
  ru: {
    ui: {
      tourTitle: "Тур по продукту",
      tourIntro:
        "Цепочка: Observe → Observe again → Compare → Share. Запись — факт URL × регион × момент.",
      startTour: "Начать тур",
      close: "Закрыть",
      next: "Далее",
      back: "Назад",
      done: "Готово",
      stepOf: "{current} / {total}",
      languageLabel: "Язык",
      skip: "Позже",
    },
    steps: {
      loop: {
        title: "Цикл записи",
        body: "Observation — это продукт. Выберите URL и регион и сохраните то, что отображалось в тот момент. Compare и Share работают с уже имеющимися записями.",
      },
      observe: {
        title: "Observe",
        body: "Используйте Попробовать по региону или Новая Observation. Выберите URL и регион. 1 регион = 1 Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Повторите тот же URL и регион, чтобы сохранить вторую метку времени. Эту пару использует Time Compare.",
      },
      records: {
        title: "Список Observations",
        body: "Ищите на этой странице по URL, региону или тегу. Тег сохраняется на каждой записи этого URL. Скриншоты удаляются после окна плана; метаданные остаются.",
      },
      recordsScreen: {
        title: "Как читать этот экран",
        body: "Поиск — это URL, заголовок страницы, регион или тег. Чипы фильтруют по тегу. Share Collection превращает выбранные существующие записи в одну ссылку — без новой съёмки. Таблица показывает время съёмки, URL, регион, статус, теги и Details.",
      },
      recordDetail: {
        title: "Открыть результат через Details",
        body: "Нажмите Details в строке, чтобы открыть эту Observation. Вы увидите скриншот и запись на момент съёмки.",
      },
      recordScreen: {
        title: "Как читать этот результат",
        body: "Одна Observation — запись URL × регион × момент. Requested и Observed остаются разделены. Скриншот — то, что отображалось в момент съёмки. Page Signals — ориентировочный балл html_signals, не Observed. Печать записи подтверждения — справочная запись, не сторонняя проверка. Monitoring на Starter / Pro тратит одну Observation на каждый запланированный запуск. Compare, Share и CSV используют только существующие записи.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare и Region Compare — разные оси. Скриншоты только Same / Changed / Not comparable. Changed значит, что содержимое изображения отличается, а не что страница изменилась.",
      },
      share: {
        title: "Share",
        body: "Выберите записи и создайте Share Collection, чтобы передать существующие Observation одной публичной ссылкой. Дополнительной съёмки нет.",
      },
    },
  },
  ar: {
    ui: {
      tourTitle: "جولة المنتج",
      tourIntro:
        "المسار هو Observe → Observe again → Compare → Share. السجل هو حقيقة عنوان URL × منطقة × وقت.",
      startTour: "بدء الجولة",
      close: "إغلاق",
      next: "التالي",
      back: "رجوع",
      done: "تم",
      stepOf: "{current} / {total}",
      languageLabel: "اللغة",
      skip: "لاحقًا",
    },
    steps: {
      loop: {
        title: "حلقة التسجيل",
        body: "Observation هو المنتج. اختر عنوان URL ومنطقة، ثم احفظ ما عُرض في ذلك الوقت. Compare و Share يعملان على سجلات لديك بالفعل.",
      },
      observe: {
        title: "Observe",
        body: "استخدم التجربة حسب المنطقة أو Observation جديدة. اختر عنوان URL ومنطقة. منطقة واحدة = Observation واحدة.",
      },
      observeAgain: {
        title: "Observe again",
        body: "أعد تشغيل نفس العنوان والمنطقة لتحفظ طابعًا زمنيًا ثانيًا. هذا الزوج هو ما يستخدمه Time Compare.",
      },
      records: {
        title: "قائمة Observations",
        body: "ابحث في هذه الصفحة حسب URL أو المنطقة أو الوسم. يُحفظ الوسم على كل سجل لذلك العنوان. تُحذف لقطات الشاشة بعد نافذة الخطة؛ وتبقى البيانات الوصفية.",
      },
      recordsScreen: {
        title: "كيف تقرأ هذه الشاشة",
        body: "البحث هو URL أو عنوان الصفحة أو المنطقة أو الوسم. الرقائق تصفّي حسب الوسم. Share Collection يحوّل السجلات الموجودة المحددة إلى رابط واحد — بلا التقاط جديد. يعرض الجدول وقت الالتقاط وURL والمنطقة والحالة والوسوم وDetails.",
      },
      recordDetail: {
        title: "افتح النتيجة عبر Details",
        body: "اضغط Details في صف لفتح تلك Observation. سترى لقطة الشاشة والسجل من وقت الالتقاط.",
      },
      recordScreen: {
        title: "كيف تقرأ هذه النتيجة",
        body: "Observation واحدة هي سجل URL × منطقة × وقت. Requested و Observed يبقيان منفصلين. لقطة الشاشة هي ما عُرض وقت الالتقاط. Page Signals درجة إرشادية لـ html_signals — وليست Observed. ختم سجل التأكيد سجل مرجعي، وليس تحققًا من طرف ثالث. Monitoring على Starter / Pro يستخدم Observation واحدة لكل تشغيل مجدول. Compare و Share و CSV تستخدم السجلات الموجودة فقط.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare و Region Compare محوران منفصلان. لقطات الشاشة فقط Same / Changed / Not comparable. Changed تعني اختلاف محتوى الصورة، لا أن الصفحة تغيّرت.",
      },
      share: {
        title: "Share",
        body: "اختر سجلات وأنشئ Share Collection لتسليم Observations موجودة برابط عام واحد. بلا التقاط إضافي.",
      },
    },
  },
  hi: {
    ui: {
      tourTitle: "उत्पाद टूर",
      tourIntro:
        "क्रम Observe → Observe again → Compare → Share है। रिकॉर्ड URL × क्षेत्र × समय का तथ्य है।",
      startTour: "टूर शुरू करें",
      close: "बंद करें",
      next: "आगे",
      back: "पीछे",
      done: "पूर्ण",
      stepOf: "{current} / {total}",
      languageLabel: "भाषा",
      skip: "बाद में",
    },
    steps: {
      loop: {
        title: "रिकॉर्डिंग लूप",
        body: "Observation ही उत्पाद है। URL और क्षेत्र चुनें, फिर उस समय जो रेंडर हुआ उसे रखें। Compare और Share आपके पास पहले से मौजूद रिकॉर्ड पर चलते हैं।",
      },
      observe: {
        title: "Observe",
        body: "क्षेत्र से आज़माएँ या नई Observation का उपयोग करें। URL और क्षेत्र चुनें। एक क्षेत्र = एक Observation।",
      },
      observeAgain: {
        title: "Observe again",
        body: "वही URL और क्षेत्र फिर चलाएँ, तो दूसरा समय-चिह्न बचता है। Time Compare उसी जोड़े का उपयोग करता है।",
      },
      records: {
        title: "Observations सूची",
        body: "इस पृष्ठ पर URL, क्षेत्र या टैग से खोजें। टैग उस URL के हर रिकॉर्ड पर सहेजा जाता है। स्क्रीनशॉट योजना विंडो के बाद हटा दिए जाते हैं; मेटाडेटा रहता है।",
      },
      recordsScreen: {
        title: "इस स्क्रीन को कैसे पढ़ें",
        body: "खोज URL, पृष्ठ शीर्षक, क्षेत्र या टैग है। चिप्स टैग से फ़िल्टर करते हैं। Share Collection चुने गए मौजूदा रिकॉर्ड को एक लिंक बनाता है — कोई नया कैप्चर नहीं। तालिका कैप्चर समय, URL, क्षेत्र, स्थिति, टैग और Details दिखाती है।",
      },
      recordDetail: {
        title: "Details से परिणाम खोलें",
        body: "पंक्ति पर Details दबाएँ तो वह Observation खुलती है। आपको कैप्चर समय का स्क्रीनशॉट और रिकॉर्ड दिखेगा।",
      },
      recordScreen: {
        title: "इस परिणाम को कैसे पढ़ें",
        body: "एक Observation URL × क्षेत्र × समय का रिकॉर्ड है। Requested और Observed अलग रहते हैं। स्क्रीनशॉट कैप्चर समय पर रेंडर हुआ दृश्य है। Page Signals html_signals का सांकेतिक स्कोर है — Observed नहीं। पुष्टि रिकॉर्ड मुहर एक संदर्भ रिकॉर्ड है, तृतीय-पक्ष सत्यापन नहीं। Starter / Pro पर Monitoring प्रत्येक निर्धारित चलान पर एक Observation खर्च करता है। Compare, Share और CSV केवल मौजूदा रिकॉर्ड उपयोग करते हैं।",
      },
      compare: {
        title: "Compare",
        body: "Time Compare और Region Compare अलग अक्ष हैं। स्क्रीनशॉट केवल Same / Changed / Not comparable हैं। Changed का अर्थ है छवि सामग्री अलग है — यह नहीं कि पृष्ठ बदल गया।",
      },
      share: {
        title: "Share",
        body: "रिकॉर्ड चुनकर Share Collection बनाएँ, ताकि मौजूदा Observation एक सार्वजनिक लिंक पर पहुँचाई जा सकें। कोई अतिरिक्त कैप्चर नहीं।",
      },
    },
  },
  id: {
    ui: {
      tourTitle: "Tur produk",
      tourIntro:
        "Alurnya Observe → Observe again → Compare → Share. Catatan adalah fakta URL × wilayah × waktu.",
      startTour: "Mulai tur",
      close: "Tutup",
      next: "Lanjut",
      back: "Kembali",
      done: "Selesai",
      stepOf: "{current} / {total}",
      languageLabel: "Bahasa",
      skip: "Nanti",
    },
    steps: {
      loop: {
        title: "Loop pencatatan",
        body: "Observation adalah produknya. Pilih URL dan wilayah, lalu simpan tampilan yang ter-render saat itu. Compare dan Share berjalan pada catatan yang sudah Anda punya.",
      },
      observe: {
        title: "Observe",
        body: "Gunakan Coba per wilayah atau Observation baru. Pilih URL dan wilayah. Satu wilayah = satu Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Jalankan URL dan wilayah yang sama lagi untuk menyimpan stempel waktu kedua. Pasangan itu yang dipakai Time Compare.",
      },
      records: {
        title: "Daftar Observations",
        body: "Cari di halaman ini menurut URL, wilayah, atau tag. Tag disimpan pada setiap catatan URL itu. Screenshot dihapus setelah jendela paket; metadata tetap ada.",
      },
      recordsScreen: {
        title: "Cara membaca layar ini",
        body: "Pencarian adalah URL, judul halaman, wilayah, atau tag. Chip memfilter menurut tag. Share Collection mengubah catatan yang ada yang dipilih menjadi satu tautan — tanpa pengambilan baru. Tabel menampilkan waktu pengambilan, URL, wilayah, status, tag, dan Details.",
      },
      recordDetail: {
        title: "Buka hasil dengan Details",
        body: "Tekan Details pada baris untuk membuka Observation itu. Anda akan melihat screenshot dan catatan dari waktu pengambilan.",
      },
      recordScreen: {
        title: "Cara membaca hasil ini",
        body: "Satu Observation adalah catatan URL × wilayah × waktu. Requested dan Observed tetap terpisah. Screenshot adalah tampilan yang ter-render pada waktu pengambilan. Page Signals adalah skor indikatif html_signals — bukan Observed. Segel catatan konfirmasi adalah catatan referensi, bukan verifikasi pihak ketiga. Monitoring di Starter / Pro memakai satu Observation per eksekusi terjadwal. Compare, Share, dan CSV hanya memakai catatan yang ada.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare dan Region Compare adalah sumbu terpisah. Screenshot hanya Same / Changed / Not comparable. Changed berarti isi gambar berbeda — bukan bahwa halaman berubah.",
      },
      share: {
        title: "Share",
        body: "Pilih catatan dan buat Share Collection untuk menyerahkan Observation yang ada dalam satu tautan publik. Tidak ada pengambilan tambahan.",
      },
    },
  },
  th: {
    ui: {
      tourTitle: "ทัวร์ผลิตภัณฑ์",
      tourIntro:
        "ลำดับคือ Observe → Observe again → Compare → Share บันทึกคือข้อเท็จจริงของ URL × ภูมิภาค × เวลา",
      startTour: "เริ่มทัวร์",
      close: "ปิด",
      next: "ถัดไป",
      back: "กลับ",
      done: "เสร็จ",
      stepOf: "{current} / {total}",
      languageLabel: "ภาษา",
      skip: "ไว้ก่อน",
    },
    steps: {
      loop: {
        title: "วงจรการบันทึก",
        body: "Observation คือผลิตภัณฑ์ เลือก URL และภูมิภาค แล้วเก็บสิ่งที่เรนเดอร์ ณ เวลานั้น Compare และ Share ทำงานบนบันทึกที่คุณมีอยู่แล้ว",
      },
      observe: {
        title: "Observe",
        body: "ใช้ ลองตามภูมิภาค หรือ Observation ใหม่ เลือก URL และภูมิภาค 1 ภูมิภาค = 1 Observation",
      },
      observeAgain: {
        title: "Observe again",
        body: "รัน URL และภูมิภาคเดิมอีกครั้ง จะได้บันทึกเวลาที่สอง คู่นั้นคือสิ่งที่ Time Compare ใช้",
      },
      records: {
        title: "รายการ Observations",
        body: "ค้นหาหน้านี้ตาม URL ภูมิภาค หรือแท็ก แท็กถูกบันทึกบนทุกบันทึกของ URL นั้น สกรีนช็อตถูกลบหลังหน้าต่างแพลน เมทาดาทายังคงอยู่",
      },
      recordsScreen: {
        title: "วิธีอ่านหน้าจอนี้",
        body: "การค้นหาคือ URL ชื่อหน้า ภูมิภาค หรือแท็ก ชิปกรองตามแท็ก Share Collection เปลี่ยนบันทึกที่มีอยู่ที่เลือกเป็นลิงก์เดียว — ไม่มีการถ่ายใหม่ ตารางแสดงเวลาถ่าย URL ภูมิภาค สถานะ แท็ก และ Details",
      },
      recordDetail: {
        title: "เปิดผลลัพธ์ด้วย Details",
        body: "กด Details บนแถวเพื่อเปิด Observation นั้น คุณจะเห็นสกรีนช็อตและบันทึกจากเวลาถ่าย",
      },
      recordScreen: {
        title: "วิธีอ่านผลลัพธ์นี้",
        body: "Observation หนึ่งรายการคือบันทึกของ URL × ภูมิภาค × เวลา Requested กับ Observed แยกกัน สกรีนช็อตคือสิ่งที่เรนเดอร์ ณ เวลาถ่าย Page Signals เป็นคะแนนอ้างอิงของ html_signals — ไม่ใช่ Observed ตราประทับบันทึกยืนยันเป็นบันทึกอ้างอิง ไม่ใช่การยืนยันจากบุคคลที่สาม Monitoring บน Starter / Pro ใช้ Observation หนึ่งรายการต่อการรันตามกำหนด Compare, Share และ CSV ใช้เฉพาะบันทึกที่มีอยู่",
      },
      compare: {
        title: "Compare",
        body: "Time Compare กับ Region Compare เป็นคนละแกน สกรีนช็อตมีแค่ Same / Changed / Not comparable Changed หมายถึงเนื้อหาภาพต่างกัน ไม่ได้แปลว่าหน้าเว็บเปลี่ยน",
      },
      share: {
        title: "Share",
        body: "เลือกบันทึกแล้วสร้าง Share Collection เพื่อส่ง Observation ที่มีอยู่ด้วยลิงก์สาธารณะเดียว ไม่มีการถ่ายเพิ่ม",
      },
    },
  },
  vi: {
    ui: {
      tourTitle: "Tour sản phẩm",
      tourIntro:
        "Luồng là Observe → Observe again → Compare → Share. Bản ghi là sự thật của URL × khu vực × thời điểm.",
      startTour: "Bắt đầu tour",
      close: "Đóng",
      next: "Tiếp",
      back: "Quay lại",
      done: "Xong",
      stepOf: "{current} / {total}",
      languageLabel: "Ngôn ngữ",
      skip: "Để sau",
    },
    steps: {
      loop: {
        title: "Vòng ghi",
        body: "Observation là sản phẩm. Chọn URL và khu vực, rồi lưu những gì được render lúc đó. Compare và Share chạy trên bản ghi bạn đã có.",
      },
      observe: {
        title: "Observe",
        body: "Dùng Thử theo khu vực hoặc Observation mới. Chọn URL và khu vực. Một khu vực = một Observation.",
      },
      observeAgain: {
        title: "Observe again",
        body: "Chạy lại cùng URL và khu vực để lưu mốc thời gian thứ hai. Cặp đó là thứ Time Compare dùng.",
      },
      records: {
        title: "Danh sách Observations",
        body: "Tìm trên trang này theo URL, khu vực hoặc thẻ. Thẻ được lưu trên mọi bản ghi của URL đó. Ảnh chụp bị xóa sau cửa sổ gói; metadata còn lại.",
      },
      recordsScreen: {
        title: "Cách đọc màn hình này",
        body: "Tìm kiếm là URL, tiêu đề trang, khu vực hoặc thẻ. Chip lọc theo thẻ. Share Collection biến các bản ghi sẵn có đã chọn thành một liên kết — không chụp mới. Bảng hiện thời điểm chụp, URL, khu vực, trạng thái, thẻ và Details.",
      },
      recordDetail: {
        title: "Mở kết quả bằng Details",
        body: "Nhấn Details trên một hàng để mở Observation đó. Bạn sẽ thấy ảnh chụp và bản ghi từ thời điểm chụp.",
      },
      recordScreen: {
        title: "Cách đọc kết quả này",
        body: "Một Observation là bản ghi của URL × khu vực × thời điểm. Requested và Observed được giữ tách. Ảnh chụp là những gì được render lúc chụp. Page Signals là điểm html_signals mang tính tham khảo — không phải Observed. Con dấu bản ghi xác nhận là bản ghi tham chiếu, không phải xác minh bên thứ ba. Monitoring trên Starter / Pro dùng một Observation mỗi lần chạy theo lịch. Compare, Share và CSV chỉ dùng bản ghi sẵn có.",
      },
      compare: {
        title: "Compare",
        body: "Time Compare và Region Compare là hai trục khác nhau. Ảnh chụp chỉ Same / Changed / Not comparable. Changed nghĩa là nội dung ảnh khác — không phải trang đã đổi.",
      },
      share: {
        title: "Share",
        body: "Chọn bản ghi và tạo Share Collection để giao Observation sẵn có bằng một liên kết công khai. Không chụp thêm.",
      },
    },
  },
};

export function getProductTourCopy(lang: string): ProductTourCopy {
  return isOnboardingLang(lang) ? productTourCopy[lang] : DEFAULT;
}
