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
    // 正态分布函数D
    // 估算在受到表面粗糙度的影响下，取向方向与中间向量一致的微平面的数量。这是用来估算微平面的主要函数。
    //当粗糙度很低（也就是说表面很光滑）的时候，与中间向量取向一致的微平面会高度集中在一个很小的半径范围内。
    // 由于这种集中性，NDF最终会生成一个非常明亮的斑点。但是当表面比较粗糙的时候，微平面的取向方向会更加的随机。
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
    // 几何函数从统计学上近似的求得了微平面间相互遮蔽的比率，这种相互遮蔽会损耗光线的能量。
    // 为了有效的估算几何部分，需要将观察方向（几何遮蔽(Geometry Obstruction)）和光线方向向量（几何阴影(Geometry Shadowing)）都考虑进去。
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2; // 史密斯法(Smith’s method)
}
// ----------------------------------------------------------------------------
vec3 fresnelSchlick(float cosTheta, vec3 F0)
{
    // 镜面反射 和 漫反射 的系数， 或者说发生表面反射和折射的光线的比值。
    // 左侧表示的是漫反射部分
    // 菲涅尔方程返回的是一个物体表面光线被反射的百分比， 也就是我们反射方程中的参数ks
    // Fresnel-Schlick近似接受一个参数F0，被称为0°入射角的反射(surface reflection at zero incidence)
    // 表示如果直接(垂直)观察表面的时候有多少光线会被反射。 
    // 这个参数F0会因为材料不同而不同，而且会因为材质是金属而发生变色。
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
// ----------------------------------------------------------------------------
void main()
{		
    vec3 N = normalize(Normal); //法向量
    vec3 V = normalize(camPos - WorldPos); //视线向量

    // 在PBR金属流中我们简单地认为大多数的绝缘体在F0为 0.04 的时候看起来视觉上是正确的，
    // 我们同时会特别指定F0当我们遇到金属表面并且给定反射率的时候。
    // 对于非金属材质来说F0永远保持0.04这个值，我们会根据表面的金属性来改变F0这个值， 并且在原来的F0和反射率中插值计算F0。
    vec3 F0 = vec3(0.04); 
    F0 = mix(F0, albedo, metallic); // mix(x,y,a)  a控制混合结果 return x(1-a) +y*a  返回 线性混合的值

    // 反射方程
    vec3 Lo = vec3(0.0);
    for(int i = 0; i < 4; ++i)  //循环遍历每一个光源
    {
        // 首先我们来计算一些可以预计算的光照变量
        vec3 L = normalize(lightPositions[i] - WorldPos);
        vec3 H = normalize(V + L);
        // 计算他们独立的辐射率然后求和，接着根据BRDF和光源的入射角来缩放该辐射率
        float distance = length(lightPositions[i] - WorldPos); //光 到 物体的距离
        //由于我们线性空间内计算光照（我们会在着色器的尾部进行Gamma校正），我们使用在物理上更为准确的平方倒数作为衰减。
        float attenuation = 1.0 / (distance * distance); //计算 衰减 
        vec3 radiance = lightColors[i] * attenuation; //radiance 辐射率

        // 然后，对于每一个光源我们都想计算完整的 Cook-Torrance specular BRDF项：
        // ----------------------------------------------------------------------------

        float NDF = DistributionGGX(N, H, roughness);   
        float G   = GeometrySmith(N, V, L, roughness);      
        vec3 F    = fresnelSchlick(clamp(dot(H, V), 0.0, 1.0), F0);
           
        vec3 nominator    = NDF * G * F; 
        float denominator = 4 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0);
        vec3 specular = nominator / max(denominator, 0.001); // prevent divide by zero for NdotV=0.0 or NdotL=0.0
        
        // 我们可以使用F表示镜面反射在所有打在物体表面上的光线的贡献。 从kS我们很容易计算折射的比值kD：
        // 我们可以看作kS表示光能中被反射的能量的比例， 而剩下的光能会被折射， 比值即为kD。
        // 更进一步来说，因为金属不会折射光线，因此不会有漫反射。所以如果表面是金属的，我们会把系数kD变为0。
        vec3 kS = F;
        vec3 kD = vec3(1.0) - kS;
        kD *= 1.0 - metallic;	  

        float NdotL = max(dot(N, L), 0.0);        

        // 最终的结果Lo，或者说是出射光线的辐射率，实际上是反射率方程的在半球领域Ω的积分的结果。
        // 比较重要的是我们没有把kS乘进去我们的反射率方程中，
        // 这是因为我们已经在specualr BRDF中乘了菲涅尔系数F了，因为kS等于F，因此我们不需要再乘一次。
        Lo += (kD * albedo / PI + specular) * radiance * NdotL;  
    }   
    
    // 剩下的工作就是加一个环境光照项给Lo，然后我们就拥有了片段的最后颜色：
    vec3 ambient = vec3(0.03) * albedo * ao;

    vec3 color = ambient + Lo;

    // 采用线性颜色空间和HDR在PBR渲染管线中非常重要。
    // 如果没有这些操作，几乎是不可能正确地捕获到因光照强度变化的细节，
    // 这最终会导致你的计算变得不正确，在视觉上看上去非常不自然。

    // HDR 色调映射
    color = color / (color + vec3(1.0));

    // gamma 修正
    color = pow(color, vec3(1.0/2.2)); 

    FragColor = vec4(color, 1.0);
}