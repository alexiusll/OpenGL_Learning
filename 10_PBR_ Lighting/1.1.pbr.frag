#version 330 core
out vec4 FragColor;
in vec2 TexCoords;
in vec3 WorldPos;
in vec3 Normal;

// material parameters
uniform vec3 albedo;
uniform float metallic;
uniform float roughness;
uniform float ao;

// lights
uniform vec3 lightPositions[4];
uniform vec3 lightColors[4];

uniform vec3 camPos;

const float PI = 3.14159265359;
// ----------------------------------------------------------------------------
float DistributionGGX(vec3 N, vec3 H, float roughness)
{ 
    // ��̬�ֲ�����D
    // �������ܵ�����ֲڶȵ�Ӱ���£�ȡ�������м�����һ�µ�΢ƽ���������������������΢ƽ�����Ҫ������
    //���ֲڶȺܵͣ�Ҳ����˵����ܹ⻬����ʱ�����м�����ȡ��һ�µ�΢ƽ���߶ȼ�����һ����С�İ뾶��Χ�ڡ�
    // �������ּ����ԣ�NDF���ջ�����һ���ǳ������İߵ㡣���ǵ�����Ƚϴֲڵ�ʱ��΢ƽ���ȡ�������ӵ������
    float a = roughness*roughness;
    float a2 = a*a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH*NdotH;

    float nom   = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return nom / denom; // prevent divide by zero for roughness=0.0 and NdotH=1.0
}
// ----------------------------------------------------------------------------
float GeometrySchlickGGX(float NdotV, float roughness)
{
    float r = (roughness + 1.0);
    float k = (r*r) / 8.0;

    float nom   = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return nom / denom;
}
// ----------------------------------------------------------------------------
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
{
    // ���κ�����ͳ��ѧ�Ͻ��Ƶ������΢ƽ����໥�ڱεı��ʣ������໥�ڱλ���Ĺ��ߵ�������
    // Ϊ����Ч�Ĺ��㼸�β��֣���Ҫ���۲췽�򣨼����ڱ�(Geometry Obstruction)���͹��߷���������������Ӱ(Geometry Shadowing)�������ǽ�ȥ��
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2; // ʷ��˹��(Smith��s method)
}
// ----------------------------------------------------------------------------
vec3 fresnelSchlick(float cosTheta, vec3 F0)
{
    // ���淴�� �� ������ ��ϵ���� ����˵�������淴�������Ĺ��ߵı�ֵ��
    // ����ʾ���������䲿��
    // ���������̷��ص���һ�����������߱�����İٷֱȣ� Ҳ�������Ƿ��䷽���еĲ���ks
    // Fresnel-Schlick���ƽ���һ������F0������Ϊ0������ǵķ���(surface reflection at zero incidence)
    // ��ʾ���ֱ��(��ֱ)�۲�����ʱ���ж��ٹ��߻ᱻ���䡣 
    // �������F0����Ϊ���ϲ�ͬ����ͬ�����һ���Ϊ�����ǽ�����������ɫ��
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
// ----------------------------------------------------------------------------
void main()
{		
    vec3 N = normalize(Normal); //������
    vec3 V = normalize(camPos - WorldPos); //��������

    // ��PBR�����������Ǽ򵥵���Ϊ������ľ�Ե����F0Ϊ 0.04 ��ʱ�������Ӿ�������ȷ�ģ�
    // ����ͬʱ���ر�ָ��F0�����������������沢�Ҹ��������ʵ�ʱ��
    // ���ڷǽ���������˵F0��Զ����0.04���ֵ�����ǻ���ݱ���Ľ��������ı�F0���ֵ�� ������ԭ����F0�ͷ������в�ֵ����F0��
    vec3 F0 = vec3(0.04); 
    F0 = mix(F0, albedo, metallic); // mix(x,y,a)  a���ƻ�Ͻ�� return x(1-a) +y*a  ���� ���Ի�ϵ�ֵ

    // ���䷽��
    vec3 Lo = vec3(0.0);
    for(int i = 0; i < 4; ++i)  //ѭ������ÿһ����Դ
    {
        // ��������������һЩ����Ԥ����Ĺ��ձ���
        vec3 L = normalize(lightPositions[i] - WorldPos);
        vec3 H = normalize(V + L);
        // �������Ƕ����ķ�����Ȼ����ͣ����Ÿ���BRDF�͹�Դ������������Ÿ÷�����
        float distance = length(lightPositions[i] - WorldPos); //�� �� ����ľ���
        //�����������Կռ��ڼ�����գ����ǻ�����ɫ����β������GammaУ����������ʹ���������ϸ�Ϊ׼ȷ��ƽ��������Ϊ˥����
        float attenuation = 1.0 / (distance * distance); //���� ˥�� 
        vec3 radiance = lightColors[i] * attenuation; //radiance ������

        // Ȼ�󣬶���ÿһ����Դ���Ƕ������������ Cook-Torrance specular BRDF�
        // ----------------------------------------------------------------------------

        float NDF = DistributionGGX(N, H, roughness);   
        float G   = GeometrySmith(N, V, L, roughness);      
        vec3 F    = fresnelSchlick(clamp(dot(H, V), 0.0, 1.0), F0);
           
        vec3 nominator    = NDF * G * F; 
        float denominator = 4 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0);
        vec3 specular = nominator / max(denominator, 0.001); // prevent divide by zero for NdotV=0.0 or NdotL=0.0
        
        // ���ǿ���ʹ��F��ʾ���淴�������д�����������ϵĹ��ߵĹ��ס� ��kS���Ǻ����׼�������ı�ֵkD��
        // ���ǿ��Կ���kS��ʾ�����б�����������ı����� ��ʣ�µĹ��ܻᱻ���䣬 ��ֵ��ΪkD��
        // ����һ����˵����Ϊ��������������ߣ���˲����������䡣������������ǽ����ģ����ǻ��ϵ��kD��Ϊ0��
        vec3 kS = F;
        vec3 kD = vec3(1.0) - kS;
        kD *= 1.0 - metallic;	  

        float NdotL = max(dot(N, L), 0.0);        

        // ���յĽ��Lo������˵�ǳ�����ߵķ����ʣ�ʵ�����Ƿ����ʷ��̵��ڰ������򦸵Ļ��ֵĽ����
        // �Ƚ���Ҫ��������û�а�kS�˽�ȥ���ǵķ����ʷ����У�
        // ������Ϊ�����Ѿ���specualr BRDF�г��˷�����ϵ��F�ˣ���ΪkS����F��������ǲ���Ҫ�ٳ�һ�Ρ�
        Lo += (kD * albedo / PI + specular) * radiance * NdotL;  
    }   
    
    // ʣ�µĹ������Ǽ�һ�������������Lo��Ȼ�����Ǿ�ӵ����Ƭ�ε������ɫ��
    vec3 ambient = vec3(0.03) * albedo * ao;

    vec3 color = ambient + Lo;

    // ����������ɫ�ռ��HDR��PBR��Ⱦ�����зǳ���Ҫ��
    // ���û����Щ�����������ǲ�������ȷ�ز��������ǿ�ȱ仯��ϸ�ڣ�
    // �����ջᵼ����ļ����ò���ȷ�����Ӿ��Ͽ���ȥ�ǳ�����Ȼ��

    // HDR ɫ��ӳ��
    color = color / (color + vec3(1.0));

    // gamma ����
    color = pow(color, vec3(1.0/2.2)); 

    FragColor = vec4(color, 1.0);
}