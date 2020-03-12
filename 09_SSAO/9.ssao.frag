#version 330 core
out float FragColor;

in vec2 TexCoords;

//shaderSSAO�����ɫ������ӦG��������(�����������)����������ͷ���������������Ϊ���������

uniform sampler2D gPosition;
uniform sampler2D gNormal;
uniform sampler2D texNoise;

uniform vec3 samples[64];
uniform mat4 projection;

// parameters (you'd probably want to use them as uniforms to more easily tweak the effect)
int kernelSize = 64;
float radius = 0.5;
float bias = 0.025;

// ��Ļ��ƽ����������������Ļ�ֱ��ʳ���������С��ֵ������
const vec2 noiseScale = vec2(1280.0/4.0, 720.0/4.0); 

void main()
{
    // get input for SSAO algorithm
    vec3 fragPos = texture(gPosition, TexCoords).xyz;
    vec3 normal = normalize(texture(gNormal, TexCoords).rgb);
    vec3 randomVec = normalize(texture(texNoise, TexCoords * noiseScale).xyz);

    // create TBN change-of-basis matrix: from tangent-space to view-space
    vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
    vec3 bitangent = cross(normal, tangent);
    mat3 TBN = mat3(tangent, bitangent, normal);

    // ���������Ƕ�ÿ�������������е����������������߿ռ�任���۲�ռ䣬
    // �����Ǽӵ���ǰ����λ���ϣ�����Ƭ��λ������봢����ԭʼ��Ȼ����е�������Ƚ��бȽϡ�
    float occlusion = 0.0;
    for(int i = 0; i < kernelSize; ++i)
    {
        // ��ȡ����λ��
        vec3 sample = TBN * samples[i]; // ����->�۲�ռ�
        sample = fragPos + sample * radius; 
        
        // project sample position (to sample texture) (to get position on screen/texture)
        vec4 offset = vec4(sample, 1.0);
        offset = projection * offset; // �۲�->�ü��ռ�
        offset.xyz /= offset.w; // ͸�ӻ���
        offset.xyz = offset.xyz * 0.5 + 0.5; // �任��0.0 - 1.0��ֵ��
        
        // get sample depth
        float sampleDepth = texture(gPosition, offset.xy).z; // get depth value of kernel sample
        
        // range check & accumulate
        float rangeCheck = smoothstep(0.0, 1.0, radius / abs(fragPos.z - sampleDepth));
        occlusion += (sampleDepth >= sample.z + bias ? 1.0 : 0.0) * rangeCheck;           
    }
    occlusion = 1.0 - (occlusion / kernelSize);
    
    FragColor = occlusion;
}