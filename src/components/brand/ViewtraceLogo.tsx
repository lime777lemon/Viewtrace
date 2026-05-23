import Image from "next/image";

/**
 * Viewtrace のブランドロゴ。
 * `public/brand/viewtrace-logo.png`（深緑・明背景用）と
 * `public/brand/viewtrace-logo-on-dark.png`（白・暗背景用）を切り替える。
 * 親側で `className` に高さ（`h-*`）を渡し、幅は自動でアスペクト比に合わせる。
 *
 * ヘッダー等で `<Link>` の中に置く想定なので、ここでは `<Link>` を含めない。
 */
type Props = {
  /** alt 属性。装飾的に使う場合は空文字を渡す */
  alt?: string;
  /** Tailwind の高さクラス等を上書き */
  className?: string;
  /** ファーストビュー（ヘッダー）に出るので既定で `priority` を有効に */
  priority?: boolean;
  /** true のとき、暗背景用の白色版を使う（フッター等） */
  onDark?: boolean;
};

const LOGO_WIDTH = 1024;
const LOGO_HEIGHT = 434;

export function ViewtraceLogo({
  alt = "Viewtrace",
  className = "h-10 w-auto",
  priority = true,
  onDark = false,
}: Props) {
  const src = onDark ? "/brand/viewtrace-logo-on-dark.png" : "/brand/viewtrace-logo.png";
  return (
    <Image
      src={src}
      alt={alt}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority}
      className={className}
    />
  );
}
