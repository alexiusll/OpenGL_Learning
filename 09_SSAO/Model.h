#pragma once
#include <string>
#include <vector>
#include <iostream>
//����assimp��
#include <assimp/Importer.hpp>
#include <assimp/scene.h>
#include <assimp/postprocess.h>

#include "Shader.h"
#include "Mesh.h"
class Model
{
public:
	Model(const char *path)
	{
		loadModel(path);
	}
	void Draw(Shader shader); //��Ⱦģ��
private:
	//ģ������
	std::vector<Mesh> meshes;
	std::string directory;
	std::vector<Texture> textures_loaded;
	//˽�к���
	void loadModel(std::string path);
	void processNode(aiNode *node, const aiScene *scene);
	Mesh processMesh(aiMesh *mesh, const aiScene *scene);
	std::vector<Texture> loadMaterialTextures(aiMaterial *mat, aiTextureType type,
		std::string typeName);
};
