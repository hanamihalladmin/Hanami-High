type Props={className?:string;alt?:string};

const BASE_PATH=process.env.GITHUB_ACTIONS?"/Hanami-High":"";

export default function HanamiCrest({className,alt="Hanami High crest"}:Props){
  return <img className={className} src={`${BASE_PATH}/hanami-high-portal-icon.png`} alt={alt}/>;
}
