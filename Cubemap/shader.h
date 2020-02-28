#pragma once
//�������ͷ�ļ�
#include <glad/glad.h>
#include<GLFW/glfw3.h>
#include <string>
//����GLM
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>

class Shader
{
public:
	//���������ͽ⹹����
	~Shader();
	// ����ID
	unsigned int ID;

	// ��������ȡ��������ɫ��
	Shader(const char* vertexPath, const char* fragmentPath);
	// ʹ��/�������
	void use();

	// uniform���ߺ���
	void setBool(const std::string& name, bool value) const;
	void setInt(const std::string& name, int value) const;
	void setFloat(const std::string& name, float value) const;
	void setMat4(const std::string& name, glm::mat4 value) const;
	void setVec3(const std::string& name, glm::vec3 value) const;
	void setVec3(const std::string& name, float x, float y, float z) const;

private:
	void checkCompileErrors(unsigned int shader, std::string type);
};